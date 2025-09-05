"use server";

import { OnboardingPlanState, ProjectionResult } from "@/components/onboarding/types";

export async function calculateOnboardingProjection(
  data: Partial<OnboardingPlanState>,
  previousResult?: ProjectionResult | null
): Promise<ProjectionResult> {
  const {
    // Section 1
    purchaseYear, propertyValue, initialSavings,
    personalMonthlyIncome, personalMonthlyExpenses,
    // Section 2
    partnerMonthlyIncome, otherMonthlyIncome, hasFamilySupport,
    familySupportType, familySupportGiftAmount, familySupportGiftTiming,
    familySupportLoanAmount
  } = data;

  if (!purchaseYear || !propertyValue || initialSavings === undefined ||
      !personalMonthlyIncome || personalMonthlyExpenses === undefined) {
    return { success: false, message: "Dữ liệu đầu vào không đủ để tính toán.", error: "Invalid input" };
  }

  const totalMonthlyIncome = (personalMonthlyIncome || 0) + (partnerMonthlyIncome || 0) + (otherMonthlyIncome || 0);
  const monthlySavings = totalMonthlyIncome - (personalMonthlyExpenses || 0);
  
  if (monthlySavings <= 0 && !hasFamilySupport) {
    return { success: true, isAffordable: false, message: "Với thu nhập và chi tiêu hiện tại, bạn sẽ cần thay đổi lớn về chiến lược để có thể mua nhà." };
  }

  const downPaymentRequired = propertyValue * 0.2;
  const currentYear = new Date().getFullYear();
  let startingSavings = initialSavings;

  if (hasFamilySupport && familySupportType === 'GIFT' && familySupportGiftTiming === 'NOW') {
    startingSavings += (familySupportGiftAmount || 0);
  }

  for (let year = currentYear; year <= purchaseYear + 40; year++) {
    const yearsToSave = year - currentYear;
    const organicSavings = monthlySavings > 0 ? monthlySavings * 12 * yearsToSave : 0;
    
    let totalSavingsAtPurchase = startingSavings + organicSavings;

    if (hasFamilySupport) {
      if (familySupportType === 'GIFT' && familySupportGiftTiming === 'AT_PURCHASE') {
        totalSavingsAtPurchase += (familySupportGiftAmount || 0);
      }
      if (familySupportType === 'LOAN') {
        totalSavingsAtPurchase += (familySupportLoanAmount || 0);
      }
    }

    if (totalSavingsAtPurchase >= downPaymentRequired) {
      const earliestYear = year;
      const prevYear = previousResult?.earliestPurchaseYear;
      let message = "";

      if (prevYear) { // This is a recalculation (e.g., after Section 2)
        if (earliestYear < prevYear) {
          message = `Sự hỗ trợ của gia đình và người thân đã rút ngắn hành trình đáng kể 🥳 Bạn sẽ mua được nhà sớm nhất vào năm ${earliestYear}.`;
        } else {
          message = `Không sao, bàn tay ta làm nên tất cả, có sức người, sỏi đá cũng xếp được thành căn nhà đầu tiên 💪. Bạn vẫn sẽ mua được nhà sớm nhất vào năm ${earliestYear}.`;
        }
      } else { // First calculation
         if (earliestYear <= purchaseYear) {
            message = `Chúc mừng, kế hoạch mua nhà năm ${purchaseYear} của bạn hoàn toàn khả thi. Thậm chí bạn có thể mua sớm hơn nữa vào năm ${earliestYear}.`;
         } else {
            message = `Kế hoạch mua nhà năm ${purchaseYear} của bạn tạm thời chưa thể thực hiện được. Tuy nhiên, bạn có thể mua nhà sớm nhất vào năm ${earliestYear}.`;
         }
      }

      return {
        success: true,
        isAffordable: earliestYear <= purchaseYear,
        earliestPurchaseYear: earliestYear,
        message,
      };
    }
  }

  return { success: true, isAffordable: false, message: "Với các thông số hiện tại, kế hoạch mua nhà của bạn chưa khả thi. Bạn sẽ cần những thay đổi lớn về chiến lược." };
}
