"use server";

import { db } from "@/lib/db";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { computeOnboardingOutcome } from "./projectionHelpers";
import logger from "@/lib/logger";

export async function updatePlanFromOnboarding(
  planId: string,
  onboardingData: Partial<OnboardingPlanState>
) {
  if (!planId || !onboardingData) {
    return { success: false, error: "Invalid input" };
  }

  const yearsToPurchase = onboardingData.yearsToPurchase
    ? onboardingData.yearsToPurchase - new Date().getFullYear()
    : 0;

  const updates = {
    yearsToPurchase: yearsToPurchase,
    hasCoApplicant: onboardingData.hasCoApplicant || false,
    targetHousePriceN0: (onboardingData.targetHousePriceN0 || 0) * 1000,
    targetHouseType: onboardingData.targetHouseType,
    targetLocation: onboardingData.targetLocation,
    initialSavings: onboardingData.initialSavings || 0,
    userMonthlyIncome: onboardingData.userMonthlyIncome || 0,
    monthlyLivingExpenses: onboardingData.monthlyLivingExpenses,
  };

  const updatedPlan = await db.plan.update({
    where: { id: planId },
    data: updates,
  });

  try {
    const outcome = await computeOnboardingOutcome(updatedPlan as any);
    const isAffordable = outcome.purchaseProjection?.isAffordable;

    await db.plan.update({
      where: { id: updatedPlan.id },
      data: {
        firstViableYear: outcome.purchaseProjection.year,
        affordabilityOutcome: isAffordable ? "ScenarioB" : "ScenarioA",
      },
    });
  } catch (e) {
    logger.warn("Projection engine failed while updating existing plan", {
      error: String(e),
    });
  }

  return { success: true, planId: updatedPlan.id };
} 