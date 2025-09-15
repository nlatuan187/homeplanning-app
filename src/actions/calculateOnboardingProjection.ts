"use server";

import { OnboardingPlanState, ProjectionResult } from "@/components/onboarding/types";
import { generateProjections, PlanWithDetails } from "@/lib/calculations/projections/generateProjections";

// Use the real projection engine for Quick Check so UI matches projections everywhere
export async function calculateOnboardingProjection(
  data: Partial<OnboardingPlanState>,
  previousResult?: ProjectionResult | null
): Promise<ProjectionResult> {
  const {
    yearsToPurchase, targetHousePriceN0, initialSavings,
    userMonthlyIncome, monthlyLivingExpenses,
    coApplicantMonthlyIncome, monthlyOtherIncome,
  } = data;

  if (!yearsToPurchase || !targetHousePriceN0 || initialSavings === undefined || userMonthlyIncome === undefined || monthlyLivingExpenses === undefined) {
    return { success: false, error: "Invalid input" };
  }

  // Build a minimal plan for the engine
  const yearToPurchase = yearsToPurchase ? yearsToPurchase - new Date().getFullYear() : undefined;
  if (!yearToPurchase) {
    return { success: false, error: "Invalid yearsToPurchase" };
  }
  const planForEngine: Partial<PlanWithDetails> = {
    createdAt: new Date(),
    yearsToPurchase: yearToPurchase,
    targetHousePriceN0: targetHousePriceN0,
    initialSavings: initialSavings || 0,
    userMonthlyIncome: userMonthlyIncome || 0,
    monthlyOtherIncome: monthlyOtherIncome || 0,
    hasCoApplicant: !!(coApplicantMonthlyIncome && coApplicantMonthlyIncome > 0),
    coApplicantMonthlyIncome: coApplicantMonthlyIncome || 0,
    monthlyLivingExpenses: monthlyLivingExpenses || 0,
    monthlyNonHousingDebt: 0,
    currentAnnualInsurancePremium: 0,
    pctSalaryGrowth: 7,
    pctExpenseGrowth: 4,
    pctHouseGrowth: 10,
    pctInvestmentReturn: 9,
    loanInterestRate: 11,
    loanTermYears: 25,
    paymentMethod: "fixed",
  } as Partial<PlanWithDetails>;

  const projections = generateProjections(planForEngine);
  const purchaseProjection = projections.find(p => p.year === yearsToPurchase) || projections[projections.length - 1];
  const earliest = projections.find(p => p.isAffordable) || projections[0];
  const earliestYear = earliest.year;
  const nextAffordable = projections.find(p => p.year > yearsToPurchase && p.isAffordable) || null;

  return {
    success: true,
    isAffordable: purchaseProjection.isAffordable,
    earliestPurchaseYear: earliestYear,
    selectedPurchaseYear: yearsToPurchase,
    purchaseProjectionYear: purchaseProjection.year,
    nextAffordableYear: nextAffordable?.year,
  };
}
