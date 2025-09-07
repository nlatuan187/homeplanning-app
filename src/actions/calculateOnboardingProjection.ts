"use server";

import { OnboardingPlanState, ProjectionResult } from "@/components/onboarding/types";
import { generateProjections, PlanWithDetails } from "@/lib/calculations/projections/generateProjections";

// Use the real projection engine for Quick Check so UI matches projections everywhere
export async function calculateOnboardingProjection(
  data: Partial<OnboardingPlanState>,
  previousResult?: ProjectionResult | null
): Promise<ProjectionResult> {
  const {
    purchaseYear, propertyValue, initialSavings,
    personalMonthlyIncome, personalMonthlyExpenses,
    partnerMonthlyIncome, otherMonthlyIncome,
    hasFamilySupport, familySupportType, familySupportGiftAmount, familySupportGiftTiming,
    familySupportLoanAmount,
  } = data;

  if (!purchaseYear || !propertyValue || initialSavings === undefined || personalMonthlyIncome === undefined || personalMonthlyExpenses === undefined) {
    return { success: false, message: "Dữ liệu đầu vào không đủ để tính toán.", error: "Invalid input" };
  }

  // Build a minimal plan for the engine
  const yearsToPurchase = purchaseYear - new Date().getFullYear();
  const planForEngine: Partial<PlanWithDetails> = {
    createdAt: new Date(),
    yearsToPurchase,
    targetHousePriceN0: propertyValue,
    initialSavings: initialSavings || 0,
    userMonthlyIncome: personalMonthlyIncome || 0,
    monthlyOtherIncome: otherMonthlyIncome || 0,
    hasCoApplicant: !!(partnerMonthlyIncome && partnerMonthlyIncome > 0),
    coApplicantMonthlyIncome: partnerMonthlyIncome || 0,
    monthlyLivingExpenses: personalMonthlyExpenses || 0,
    monthlyNonHousingDebt: 0,
    currentAnnualInsurancePremium: 0,
    pctSalaryGrowth: 7,
    pctExpenseGrowth: 4,
    pctHouseGrowth: 10,
    pctInvestmentReturn: 9,
    loanInterestRate: 11,
    loanTermYears: 25,
    paymentMethod: "fixed",
    familySupport: hasFamilySupport ? {
      familySupportType: familySupportType || null,
      familySupportAmount: (familySupportType === 'GIFT' ? familySupportGiftAmount : familySupportLoanAmount) || 0,
      familyGiftTiming: familySupportGiftTiming || null,
      familyLoanRepaymentType: null,
      familyLoanInterestRate: null,
      familyLoanTermYears: null,
    } : null,
  } as Partial<PlanWithDetails>;

  const projections = generateProjections(planForEngine);
  const purchaseProjection = projections.find(p => p.year === purchaseYear) || projections[projections.length - 1];
  const earliest = projections.find(p => p.isAffordable) || projections[0];
  const earliestYear = earliest.year;
  const nextAffordable = projections.find(p => p.year > purchaseYear && p.isAffordable) || null;

  let message = "";
  const prevYear = previousResult?.earliestPurchaseYear;
  if (prevYear) {
    message = earliestYear < prevYear
      ? `Sự hỗ trợ của gia đình và người thân đã rút ngắn hành trình đáng kể 🥳 Bạn sẽ mua được nhà sớm nhất vào năm ${earliestYear}.`
      : `Không sao, bàn tay ta làm nên tất cả 💪. Bạn sẽ mua được nhà sớm nhất vào năm ${earliestYear}.`;
  } else {
    message = purchaseProjection.isAffordable
      ? `Chúc mừng, kế hoạch mua nhà năm ${purchaseYear} của bạn khả thi. Bạn thậm chí có thể mua sớm hơn vào năm ${earliestYear}.`
      : `Kế hoạch mua nhà năm ${purchaseYear} chưa khả thi. Tuy nhiên, bạn có thể mua sớm nhất vào năm ${earliestYear}.`;
  }

  return {
    success: true,
    isAffordable: purchaseProjection.isAffordable,
    earliestPurchaseYear: earliestYear,
    selectedPurchaseYear: purchaseYear,
    purchaseProjectionYear: purchaseProjection.year,
    nextAffordableYear: nextAffordable?.year,
    message,
  };
}
