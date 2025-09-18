"use server";

import { db } from "@/lib/db";
import logger from "@/lib/logger";
import { generateProjections, PlanWithDetails } from "@/lib/calculations/projections/generateProjections";
import { ProjectionRow } from "@/lib/calculations/affordability";

/**
 * Build a complete PlanWithDetails object from DB for the projection engine.
 * Fills safe defaults for missing onboarding fields so the engine is stable
 * during early steps.
 */
export async function buildPlanForProjection(planId: string): Promise<PlanWithDetails> {
  const plan = await db.plan.findUnique({
    where: { id: planId },
    include: {
      familySupport: true,
    },
  });

  if (!plan) {
    throw new Error(`Plan not found for projection: ${planId}`);
  }

  // Map DB -> engine plan with safe defaults
  const planForEngine: PlanWithDetails = {
    id: plan.id,
    planName: plan.planName || "",
    yearsToPurchase: plan.yearsToPurchase || 5,
    targetHousePriceN0: plan.targetHousePriceN0 || 0,
    targetHouseType: plan.targetHouseType || "Chung cư",
    targetLocation: plan.targetLocation || "",
    initialSavings: plan.initialSavings || 0,
    userMonthlyIncome: plan.userMonthlyIncome || 0,
    monthlyLivingExpenses: plan.monthlyLivingExpenses || 0,
    monthlyNonHousingDebt: plan.monthlyNonHousingDebt || 0,
    currentAnnualInsurancePremium: plan.currentAnnualInsurancePremium || 0,
    pctSalaryGrowth: plan.pctSalaryGrowth || 7,
    pctExpenseGrowth: plan.pctExpenseGrowth || 4,
    pctHouseGrowth: plan.pctHouseGrowth || 10,
    pctInvestmentReturn: plan.pctInvestmentReturn || 9,
    loanInterestRate: plan.loanInterestRate || 11,
    loanTermYears: plan.loanTermYears || 25,
    paymentMethod: (plan.paymentMethod as any) || "BankLoan",
    hasCoApplicant: plan.hasCoApplicant || false,
    coApplicantMonthlyIncome: plan.familySupport?.coApplicantMonthlyIncome || 0,
    monthlyOtherIncome: plan.familySupport?.monthlyOtherIncome || 0,
    hasFamilySupport: plan.familySupport?.hasFamilySupport || false,
    familySupportType: (plan.familySupport?.familySupportType as any) || null,
    familySupportAmount: plan.familySupport?.familySupportAmount || 0,
    familyGiftTiming: (plan.familySupport?.familyGiftTiming as any) || null,
    confirmedPurchaseYear: plan.confirmedPurchaseYear || undefined,
    createdAt: plan.createdAt,
  } as unknown as PlanWithDetails;

  return planForEngine;
}

/**
 * Compute outcome for onboarding sections using the projection engine.
 * Returns earliest viable year and first target-year projection row.
 */
export async function computeOnboardingOutcome(plan: PlanWithDetails): Promise<{
  projections: ProjectionRow[];
  earliestPurchaseYear: number;
  purchaseProjection: ProjectionRow;
  message: string;
}> {
  const projections = generateProjections(plan);

  // Strategy: prefer confirmed year; else first year where down payment is achievable
  const currentYear = new Date(plan.createdAt || new Date()).getFullYear();
  const targetYear = plan.confirmedPurchaseYear || (currentYear + (plan.yearsToPurchase || 0));

  // Find the earliest year where plan becomes affordable per engine output
  const earliest = projections.find((row) => row.isAffordable) || undefined;
  const earliestYear = earliest?.year || 0;

  const purchaseProjection = projections.find((r) => r.year === targetYear) || earliest || projections[0];

  const message = earliestYear <= targetYear
    ? `Kế hoạch khả thi. Bạn có thể mua sớm nhất vào năm ${earliestYear}.`
    : `Chưa đạt mục tiêu. Bạn có thể mua sớm nhất vào năm ${earliestYear}.`;

  logger.info("computeOnboardingOutcome", {
    planId: plan.id,
    earliestYear,
    targetYear,
  });

  return { projections, earliestPurchaseYear: earliestYear, purchaseProjection, message };
}

export async function runProjectionWithEngine(planId: string): Promise<{ earliestPurchaseYear: number; message: string; projections?: ProjectionRow[];}> {
  const enginePlan = await buildPlanForProjection(planId);
  const outcome = await computeOnboardingOutcome(enginePlan);
  return { earliestPurchaseYear: outcome.earliestPurchaseYear, message: outcome.message, projections: outcome.projections };
}


