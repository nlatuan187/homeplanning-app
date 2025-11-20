"use server";

import { OnboardingPlanState, ProjectionResult } from "@/components/onboarding/types";
import { ProjectionRow } from "@/lib/calculations/affordability";
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
  if (yearToPurchase === undefined || yearToPurchase < 0) {
    return { success: false, error: "Invalid yearsToPurchase" };
  }
  const planForEngine: Partial<PlanWithDetails> = {
    yearsToPurchase: yearToPurchase,
    hasCoApplicant: coApplicantMonthlyIncome ?? false,
    targetHousePriceN0: (targetHousePriceN0 ?? 0) * 1000,
    initialSavings: initialSavings ?? 0,
    userMonthlyIncome: userMonthlyIncome ?? 0,
    monthlyLivingExpenses: monthlyLivingExpenses ?? 0,
    confirmedPurchaseYear: yearsToPurchase ?? 0,
    pctSalaryGrowth: 7.0,
    pctHouseGrowth: 10.0,
    pctExpenseGrowth: 4.0,
    pctInvestmentReturn: 11.0,
    loanInterestRate: 11.0,
    loanTermYears: 25,
    monthlyNonHousingDebt: 0,
    currentAnnualInsurancePremium: 0,
    hasNewChild: false,
    yearToHaveChild: 0,
    monthlyChildExpenses: 0,
    paymentMethod: "fixed",
    coApplicantSalaryGrowth: 7.0,
  } as Partial<PlanWithDetails>;

  const projections = generateProjections(planForEngine);
  const earliest: ProjectionRow | undefined =
    projections.find(p => p.isAffordable);
  const earliestYear = earliest?.year;

  return {
    success: true,
    isAffordable: earliest?.isAffordable,
    earliestAffordableYear: earliestYear,
    selectedPurchaseYear: yearsToPurchase,
    projectionData: projections,
  };
}
