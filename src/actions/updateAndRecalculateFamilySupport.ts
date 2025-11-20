"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { runProjectionWithEngine } from "./projectionHelpers";
import logger from "@/lib/logger";

// Helper function to compare values, handling null/undefined/0 equivalence for some fields
const areValuesEqual = (val1: any, val2: any) => {
  // Treat null, undefined, and 0 as equal for numeric fields
  if ((val1 === null || val1 === undefined) && (val2 === null || val2 === undefined)) {
    return true;
  }
  return val1 === val2;
};

export async function updateAndRecalculateFamilySupport(
  planId: string,
  formData: any,
) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const plan = await db.plan.findUnique({ where: { id: planId, userId: user.id } });
    if (!plan) return { success: false, error: "Plan not found." };

    const planReport = await db.planReport.findUnique({ where: { planId } });
    const existingResult = planReport?.projectionCache as unknown as {
      earliestPurchaseYear: number;
      message: string;
      isAffordable: boolean;
    };

    // Fetch familySupport, it might be null if it's the first time
    const familySupport = await db.planFamilySupport.findUnique({ where: { planId } });

    // TẠO DỮ LIỆU HIỆN TẠI ĐỂ SO SÁNH
    // FIX: Map directly to DB fields to match formData keys
    const currentData = {
      coApplicantMonthlyIncome: familySupport?.coApplicantMonthlyIncome,
      monthlyOtherIncome: familySupport?.monthlyOtherIncome,
      hasFamilySupport: familySupport?.hasFamilySupport ?? false,
      familySupportType: familySupport?.familySupportType,
      familySupportAmount: familySupport?.familySupportAmount,
      familyGiftTiming: familySupport?.familyGiftTiming,
      familyLoanInterestRate: familySupport?.familyLoanInterestRate,
      familyLoanRepaymentType: familySupport?.familyLoanRepaymentType,
      familyLoanTermYears: familySupport?.familyLoanTermYears,
    };

    // SO SÁNH DỮ LIỆU MỚI VÀ CŨ
    const hasChanged = Object.keys(formData).some(key =>
      !areValuesEqual(
        formData[key as keyof typeof formData],
        currentData[key as keyof typeof currentData]
      )
    );

    const previousFirstViableYear = plan.firstViableYear;

    let result: {
      earliestPurchaseYear: number;
      message: string;
      isAffordable: boolean;
    } = {
      earliestPurchaseYear: 0,
      message: "",
      isAffordable: false
    };
    let customMessage = "";

    if (hasChanged) {
      await db.$transaction([
        db.planFamilySupport.upsert({
          where: { planId },
          update: formData,
          create: { planId, ...formData },
        })
      ]);
      result = await runProjectionWithEngine(planId);

      if (result.earliestPurchaseYear === 0) {
        customMessage = "Rất tiếc, bạn sẽ không thể mua được nhà vào năm mong muốn. Tuy nhiên, bạn vẫn còn cơ hội. Tiếp tục tìm hiểu nhé?💪";
      } else if (result.earliestPurchaseYear < existingResult.earliestPurchaseYear) {
        customMessage = "Sự hỗ trợ của gia đình và người thân đã rút ngắn hành trình đáng kể 🥳";
      } else if (result.earliestPurchaseYear === existingResult.earliestPurchaseYear) {
        customMessage = `Sự hỗ trợ của gia đình giúp bạn giữ vững kế hoạch mua nhà vào năm ${result.earliestPurchaseYear}`;
      } else {
        // Trường hợp tệ hơn (earliestYear tăng lên)
        customMessage = `Với các thay đổi này, thời gian mua nhà dự kiến là năm ${result.earliestPurchaseYear}`;
      }

      await db.$transaction([
        db.planReport.upsert({
          where: { planId: plan.id },
          update: { projectionCache: result },
          create: { planId: plan.id, projectionCache: result },
        })
      ]);

      await db.plan.update({
        where: { id: planId },
        data: {
          firstViableYear: result.earliestPurchaseYear,
          // FIX: Update affordabilityOutcome. User confirmed ScenarioB = Affordable
          affordabilityOutcome: result.isAffordable ? "ScenarioB" : "ScenarioA"
        }
      });
    } else {
      result = existingResult;
      console.log("change: false");
      if (result.earliestPurchaseYear === 0) {
        customMessage = "Bạn vẫn chưa thể mua được nhà vào năm mong muốn.";
      } else if (result.isAffordable) {
        customMessage = "Kế hoạch của bạn vẫn khả thi! Tiếp tục phát huy nhé! 💪";
      } else {
        customMessage = "Không sao, bàn tay ta làm nên tất cả, có sức người, sỏi đá cũng thành căn nhà đầu tiên 💪";
      }
    }

    revalidatePath(`/plan/${planId}`);
    return {
      plan: plan,
      success: true,
      isChanged: hasChanged,
      earliestPurchaseYear: result.earliestPurchaseYear,
      message: customMessage,
      hasImproved: previousFirstViableYear && result.earliestPurchaseYear < previousFirstViableYear
    };

  } catch (error) {
    logger.error("[ACTION_ERROR] Failed to update and recalculate (FamilySupport)", { error: String(error) });
    return { success: false, error: "Đã có lỗi xảy ra phía máy chủ." };
  }
}
