"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { calculateOnboardingProjection } from "./calculateOnboardingProjection";
import { Prisma } from "@prisma/client";

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
    return { success: true, planId: existingPlan.id, existed: true };
  }

  try {
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
      firstViableYear: projectionResult.earliestPurchaseYear,
      pctSalaryGrowth: 7.0,
      pctHouseGrowth: 10.0,
      pctExpenseGrowth: 4.0,
      pctInvestmentReturn: 9.0,
      loanInterestRate: 11.0,
      loanTermYears: 25,
      paymentMethod: "BankLoan",
    };

    const newPlan = await db.plan.create({
      data: {
        ...planPayload,
        user: { connect: { id: userId } },
      },
    });

    return { success: true, planId: newPlan.id };
  } catch (error) {
    // --- STEP 2: IMPROVED ERROR LOGGING ---
    // This will print the *actual* Prisma error to your server's console (e.g., your terminal).
    console.error("!!! Critical error in createPlanFromOnboarding:", error);

    // We still return a generic error to the client for security.
    return { success: false, error: "Database error" };
  }
}
