"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { OnboardingPlanState, ProjectionResult } from "@/components/onboarding/types";
import { calculateOnboardingProjection } from "./calculateOnboardingProjection";
import { computeOnboardingOutcome } from "./projectionHelpers";
import logger from "@/lib/logger";
import { Prisma } from "@prisma/client";
import { runProjectionWithEngine } from "./projectionHelpers";
import { createOnboardingProgress, getNextOnboardingStep } from "./onboardingActions";

export type QuickCheckResultPayload = ProjectionResult;

export async function createPlanFromOnboarding(
  onboardingData: Partial<OnboardingPlanState>
) {
  console.log("[createPlanFromOnboarding] Called with data:", {
    yearsToPurchase: onboardingData.yearsToPurchase,
    targetHousePriceN0: onboardingData.targetHousePriceN0,
    monthlyLivingExpenses: onboardingData.monthlyLivingExpenses,
  });

  const clerkUser = await currentUser();
  if (!clerkUser) {
    console.error("[createPlanFromOnboarding] Unauthorized - no clerk user");
    return { success: false, error: "Unauthorized" };
  }

  // --- STEP 1: ADD SERVER-SIDE VALIDATION ---
  // This ensures data integrity before we attempt to write to the database.
  if (
    !onboardingData ||
    onboardingData.targetHousePriceN0 === undefined ||
    onboardingData.monthlyLivingExpenses === undefined ||
    !onboardingData.yearsToPurchase
  ) {
    const errorMessage = "Invalid onboarding data: Required fields are missing.";
    console.error(errorMessage, onboardingData);
    return { success: false, error: errorMessage };
  }

  const userId = clerkUser.id;
  const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

  const existingPlan = await db.plan.findFirst({ where: { userId } });
  if (existingPlan) {
    console.log("[createPlanFromOnboarding] Found existing plan:", existingPlan.id);
    try {
      // If user already has a plan, update its core fields from onboarding
      const yearsToPurchase = onboardingData.yearsToPurchase - new Date().getFullYear();
      console.log("[createPlanFromOnboarding] Updating existing plan with yearsToPurchase:", yearsToPurchase);
      const updates = {
        planName: existingPlan.planName || "Kế hoạch mua nhà đầu tiên",
        yearsToPurchase: yearsToPurchase,
        hasCoApplicant: onboardingData.hasCoApplicant || false,
        targetHousePriceN0: onboardingData.targetHousePriceN0 * 1000,
        targetHouseType: onboardingData.targetHouseType,
        targetLocation: onboardingData.targetLocation,
        initialSavings: onboardingData.initialSavings || 0,
        userMonthlyIncome: onboardingData.userMonthlyIncome || 0,
        monthlyLivingExpenses: onboardingData.monthlyLivingExpenses,
      } as const;

      const updated = await db.plan.update({ where: { id: existingPlan.id }, data: updates });

      await createOnboardingProgress(existingPlan.id);
      try {
        const outcome = await computeOnboardingOutcome({ ...(updated as any), createdAt: updated.createdAt } as any);
        const isAffordable = outcome.purchaseProjection?.isAffordable;

        await db.plan.update({
          where: { id: updated.id },
          data: {
            firstViableYear: outcome.purchaseProjection.year,
            affordabilityOutcome: isAffordable ? "ScenarioB" : "ScenarioA",
          },
        });
      } catch (e) {
        logger.warn("Projection engine failed while updating existing plan from onboarding", { error: String(e) });
      }

      // Determine the next step based on onboarding progress
      const nextStepUrl = await getNextOnboardingStep(existingPlan.id);
      console.log("[createPlanFromOnboarding] Next step for existing plan:", nextStepUrl);

      return { success: true, planId: existingPlan.id, existed: true, nextStepUrl };
    } catch (updateError) {
      console.error("[createPlanFromOnboarding] CRITICAL: Failed to update existing plan:", updateError);
      logger.error("[createPlanFromOnboarding] Failed to update existing plan", {
        error: String(updateError),
        stack: (updateError as Error)?.stack,
        planId: existingPlan.id,
      });
      return { success: false, error: `Failed to update plan: ${(updateError as Error).message}` };
    }
  }

  console.log("[createPlanFromOnboarding] No existing plan, creating new one");

  try {
    // The rest of the logic proceeds as if the user is new,
    // creating a fresh plan with the onboarding data.
    const projectionResult = await calculateOnboardingProjection(onboardingData);
    const yearsToPurchase =
      onboardingData?.yearsToPurchase ? onboardingData.yearsToPurchase - new Date().getFullYear() : undefined;
    if (yearsToPurchase === undefined || yearsToPurchase < 0) {
      return { success: false, error: "Invalid yearsToPurchase" };
    }
    const planPayload: Omit<Prisma.PlanCreateInput, "user"> = {
      userEmail: userEmail,
      planName: "Kế hoạch mua nhà đầu tiên",
      yearsToPurchase: yearsToPurchase,
      hasCoApplicant: onboardingData.hasCoApplicant,
      targetHousePriceN0: onboardingData.targetHousePriceN0 * 1000,
      targetHouseType: onboardingData.targetHouseType,
      targetLocation: onboardingData.targetLocation,
      initialSavings: onboardingData.initialSavings || 0,
      userMonthlyIncome: onboardingData.userMonthlyIncome || 0,
      monthlyLivingExpenses: onboardingData.monthlyLivingExpenses,
      // Spending section defaults
      monthlyNonHousingDebt: 0,
      currentAnnualInsurancePremium: 0,
      hasNewChild: null,
      yearToHaveChild: null,
      monthlyChildExpenses: 0,
      affordabilityOutcome: projectionResult.isAffordable
        ? "ScenarioA"
        : "ScenarioB",
      confirmedPurchaseYear: onboardingData.yearsToPurchase,
      pctSalaryGrowth: 7.0,
      pctHouseGrowth: 10.0,
      pctExpenseGrowth: 4.0,
      pctInvestmentReturn: 11.0,
      loanInterestRate: 11.0,
      loanTermYears: 25,
      paymentMethod: "BankLoan",
    };

    let newPlan = await db.plan.create({
      data: {
        ...planPayload,
        user: { connect: { id: userId } },
      },
    });

    await createOnboardingProgress(newPlan.id);

    await db.planFamilySupport.create({
      data: {
        planId: newPlan.id,
        hasFamilySupport: null,
        familySupportType: null,
        familySupportAmount: 0,
        familyGiftTiming: null,
        familyLoanRepaymentType: null,
        familyLoanInterestRate: 0,
        familyLoanTermYears: 0,
        coApplicantMonthlyIncome: 0,
        monthlyOtherIncome: 0,
      },
    });

    const projectionCache = await runProjectionWithEngine(newPlan.id);
    await db.planReport.create({
      data: {
        planId: newPlan.id,
        projectionCache: projectionCache,
      },
    });

    // Run the official projection engine and update plan with true earliest year
    try {
      const outcome = await computeOnboardingOutcome({
        ...(newPlan as any),
        createdAt: newPlan.createdAt,
      } as any);

      const isAffordable = outcome.purchaseProjection?.isAffordable ?? false;
      newPlan = await db.plan.update({
        where: { id: newPlan.id },
        data: {
          firstViableYear: outcome.purchaseProjection.year,
          affordabilityOutcome: isAffordable ? "ScenarioB" : "ScenarioA",
        },
      });
    } catch (e) {
      logger.warn("Projection engine failed during createPlanFromOnboarding; falling back to lightweight result", { error: String(e) });
    }

    return { success: true, planId: newPlan.id };
  } catch (error) {
    // --- STEP 2: IMPROVED ERROR LOGGING ---
    // This will print the *actual* Prisma error to your server's console (e.g., your terminal).
    console.error("!!! Critical error in createPlanFromOnboarding:", error);
    const projectionResult = await calculateOnboardingProjection(onboardingData);

    // We still return a generic error to the client for security.
    return { success: false, error: "Database error", projectionResult: projectionResult };
  }
}

export async function calculateQuickCheckResult(
  onboardingData: Partial<OnboardingPlanState>
) {
  const projectionResult = await calculateOnboardingProjection(onboardingData);
  return projectionResult;
}
