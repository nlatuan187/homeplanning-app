"use server";

import { OnboardingPlanState, ProjectionResult } from "@/components/onboarding/types";

// A simplified projection model for the onboarding flow.
// This should evolve to be more robust.
export async function calculateOnboardingProjection(
  data: Partial<OnboardingPlanState>
): Promise<ProjectionResult> {
  // --- SECTION 1: QUICK CHECK LOGIC ---
  const {
    purchaseYear,
    propertyValue,
    initialSavings,
    personalMonthlyIncome,
    personalMonthlyExpenses,
  } = data;

  if (
    !purchaseYear ||
    !propertyValue ||
    initialSavings === undefined ||
    !personalMonthlyIncome ||
    personalMonthlyExpenses === undefined
  ) {
    return {
      success: false,
      message: "Missing required fields for quick check.",
      error: "Invalid input",
    };
  }

  const monthlySavings = personalMonthlyIncome - personalMonthlyExpenses;

  if (monthlySavings <= 0) {
    return {
      success: true,
      isAffordable: false,
      message: "Kế hoạch mua nhà năm ... của bạn tạm thời chưa thể thực hiện được. Để có thể mua nhà, bạn sẽ cần rất nhiều thay đổi chiến lược đấy",
    };
  }

  const downPaymentRequired = propertyValue * 0.2; // Assume 20% down payment
  
  let accumulatedSavings = initialSavings;
  const currentYear = new Date().getFullYear();

  for (let year = currentYear; year <= purchaseYear + 20; year++) {
    // Calculate total savings at the beginning of this year
    if (year > currentYear) {
      accumulatedSavings += monthlySavings * 12;
    }

    if (accumulatedSavings >= downPaymentRequired) {
      const earliestYear = year;
      if (earliestYear <= purchaseYear) {
         return {
            success: true,
            isAffordable: true,
            earliestPurchaseYear: earliestYear,
            message: `Chúc mừng, kế hoạch mua nhà năm ${purchaseYear} của bạn hoàn toàn khả thi. Thậm chí bạn có thể mua sớm hơn nữa vào năm ${earliestYear}`,
        };
      } else {
         return {
            success: true,
            isAffordable: false,
            earliestPurchaseYear: earliestYear,
            message: `Kế hoạch mua nhà năm ${purchaseYear} của bạn tạm thời chưa thể thực hiện được. Tuy nhiên, bạn có thể mua nhà sớm nhất vào năm ${earliestYear}`,
        };
      }
    }
  }

  // If loop finishes, it means they can never afford it with current inputs
  return {
    success: true,
    isAffordable: false,
    message: `Kế hoạch mua nhà năm ${purchaseYear} của bạn tạm thời chưa thể thực hiện được. Để có thể mua nhà, bạn sẽ cần rất nhiều thay đổi chiến lược đấy`,
  };
}
