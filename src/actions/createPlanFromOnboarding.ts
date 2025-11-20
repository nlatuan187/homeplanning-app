"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { OnboardingPlanState, ProjectionResult } from "@/components/onboarding/types";
import { calculateOnboardingProjection } from "./calculateOnboardingProjection";
import logger from "@/lib/logger";
import { Prisma } from "@prisma/client";
import { getNextOnboardingStep } from "./onboardingActions";

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

  // --- SOLUTION for RACE CONDITION ---
  try {
    const dbUser = await db.user.findUnique({ where: { id: userId } });
    if (!dbUser) {
        logger.info(`[createPlanFromOnboarding] User ${userId} not found in DB. Creating now...`);
        await db.user.create({
            data: {
                id: userId,
                email: userEmail || "", // Ensure email is not undefined
            },
        });
        logger.info(`[createPlanFromOnboarding] User ${userId} created successfully.`);
    }
  } catch (error) { 
      logger.error("[createPlanFromOnboarding] Failed to check or create user in DB", {
          error: String(error),
          stack: (error as Error)?.stack,
          userId: userId,
      });
      return { success: false, error: "Failed to sync user account. Please try again." };
  }
  // --- END OF SOLUTION ---

  const existingPlan = await db.plan.findFirst({ where: { userId } });
  if (existingPlan) {
    console.log("[createPlanFromOnboarding] Found existing plan:", existingPlan.id);
    try {
      // If user already has a plan, update its core fields from onboarding
      const yearsToPurchase = onboardingData.yearsToPurchase - new Date().getFullYear();
      console.log("[createPlanFromOnboarding] Updating existing plan with yearsToPurchase:", yearsToPurchase);
      
      // --- OPTIMIZATION: Use lightweight projection for updates ---
      const dataForProjection = { ...onboardingData, yearsToPurchase };
      const projectionResult = await calculateOnboardingProjection(dataForProjection);

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
        // Add the result from the lightweight calculation
        firstViableYear: projectionResult.earliestAffordableYear,
        affordabilityOutcome: projectionResult.isAffordable ? "ScenarioB" : "ScenarioA",
      } as const;

      // Perform a single update
      await db.plan.update({ where: { id: existingPlan.id }, data: updates });

      // The heavy 'computeOnboardingOutcome' is removed.

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
    // --- OPTIMIZATION: Use lightweight projection and create a lightweight cache ---
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
      firstViableYear: projectionResult.earliestAffordableYear,
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

    const lightweightProjectionCache = {
      earliestPurchaseYear: projectionResult.earliestAffordableYear,
      message: projectionResult.error || "Initial calculation.",
      isAffordable: projectionResult.isAffordable,
    };

    const newPlan = await db.$transaction(async (tx) => {
      const plan = await tx.plan.create({
        data: {
          ...planPayload,
          user: { connect: { id: userId } },
        },
      });

      await tx.onboardingProgress.create({
          data: {
              planId: plan.id,
              quickCheckState: "COMPLETED",
              familySupportState: "NOT_STARTED",
              spendingState: "NOT_STARTED",
              assumptionState: "NOT_STARTED",
          }
      });

      await tx.planFamilySupport.create({
        data: {
          planId: plan.id,
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

      // Create the report with the lightweight cache
      await tx.planReport.create({
        data: {
          planId: plan.id,
          projectionCache: lightweightProjectionCache as any,
        },
      });

      return plan;
    });

    return { success: true, planId: newPlan.id };
  } catch (error) {
    console.error("!!! Critical error in createPlanFromOnboarding:", error);
    const projectionResult = await calculateOnboardingProjection(onboardingData);
    return { success: false, error: "Database error", projectionResult: projectionResult };
  }
}

export async function calculateQuickCheckResult(
  onboardingData: Partial<OnboardingPlanState>
) {
  const projectionResult = await calculateOnboardingProjection(onboardingData);
  return projectionResult;
}
