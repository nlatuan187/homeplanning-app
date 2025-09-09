"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { calculateOnboardingProjection } from "./calculateOnboardingProjection";
import { computeOnboardingOutcome } from "./projectionHelpers";
import logger from "@/lib/logger";
import { Prisma } from "@prisma/client";
import { runProjectionWithEngine } from "./projectionHelpers";

export async function createPlanFromOnboarding(
  onboardingData: Partial<OnboardingPlanState>
) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return { success: false, error: "Unauthorized" };
  }

  // --- STEP 1: ADD SERVER-SIDE VALIDATION ---
  // This ensures data integrity before we attempt to write to the database.
  if (
    !onboardingData ||
    onboardingData.propertyValue === undefined ||
    onboardingData.personalMonthlyExpenses === undefined ||
    !onboardingData.purchaseYear
  ) {
    const errorMessage = "Invalid onboarding data: Required fields are missing.";
    console.error(errorMessage, onboardingData);
    return { success: false, error: errorMessage };
  }

  const userId = clerkUser.id;
  const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

  const existingPlan = await db.plan.findFirst({ where: { userId } });
  if (existingPlan) {
    // If user already has a plan, update its core fields from onboarding
    const yearsToPurchase = onboardingData.purchaseYear - new Date().getFullYear();
    const updates = {
      planName: existingPlan.planName || "Kế hoạch mua nhà đầu tiên",
      yearsToPurchase: yearsToPurchase,
      targetHousePriceN0: onboardingData.propertyValue,
      targetHouseType: onboardingData.propertyType,
      targetLocation: onboardingData.city,
      initialSavings: onboardingData.initialSavings || 0,
      userMonthlyIncome: onboardingData.personalMonthlyIncome || 0,
      monthlyLivingExpenses: onboardingData.personalMonthlyExpenses,
    } as const;

    const updated = await db.plan.update({ where: { id: existingPlan.id }, data: updates });

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

    return { success: true, planId: existingPlan.id, existed: true };
  }

  try {
    // Keep initial lightweight check for UX; real projection will be used after create
    const projectionResult = await calculateOnboardingProjection(onboardingData);
    const yearsToPurchase =
      onboardingData.purchaseYear - new Date().getFullYear();

    const planPayload: Omit<Prisma.PlanCreateInput, "user"> = {
      userEmail: userEmail,
      planName: "Kế hoạch mua nhà đầu tiên",
      yearsToPurchase: yearsToPurchase,
      targetHousePriceN0: onboardingData.propertyValue,
      targetHouseType: onboardingData.propertyType,
      targetLocation: onboardingData.city,
      initialSavings: onboardingData.initialSavings || 0,
      userMonthlyIncome: onboardingData.personalMonthlyIncome || 0,
      monthlyLivingExpenses: onboardingData.personalMonthlyExpenses,
      affordabilityOutcome: projectionResult.isAffordable
        ? "ScenarioA"
        : "ScenarioB",
      confirmedPurchaseYear: onboardingData.purchaseYear,
      pctSalaryGrowth: 7.0,
      pctHouseGrowth: 10.0,
      pctExpenseGrowth: 4.0,
      pctInvestmentReturn: 9.0,
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

    await db.planFamilySupport.create({
      data: {
        planId: newPlan.id,
        hasFamilySupport: false,
        familySupportType: null,
        familySupportAmount: 0,
        familyGiftTiming: null,
        familyLoanRepaymentType: null,
        familyLoanInterestRate: 0, 
        familyLoanTermYears: 0,
        hasCoApplicant: false,
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

    // We still return a generic error to the client for security.
    return { success: false, error: "Database error" };
  }
}
