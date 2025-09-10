"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { runProjectionWithEngine } from "./projectionHelpers";
import logger from "@/lib/logger";
import { OnboardingPlanState } from "@/components/onboarding/types";

const areValuesEqual = (val1: any, val2: any) => {
  // Treat null, undefined, and 0 as equal for numeric fields
  if ((val1 === null || val1 === undefined) && (val2 === null || val2 === undefined)) {
    return true;
  }
  return val1 === val2;
};

export async function updateSpendingAndRecalculate(
  plan: OnboardingPlanState,
  formData: any
) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const plan = await db.plan.findFirst({ where: { userId: user.id } });
    if (!plan) return { success: false, error: "Plan not found." };

    const planReport = await db.planReport.findUnique({ where: { planId: plan.id } });
    const existingResult = planReport?.projectionCache as unknown as { earliestPurchaseYear: number; message: string; };

    const currentData = {
        monthlyNonHousingDebt: plan.monthlyNonHousingDebt,
        currentAnnualInsurancePremium: plan.currentAnnualInsurancePremium,
        currentAnnualOtherExpenses: plan.currentAnnualOtherExpenses,
    };

    const hasChanged = Object.keys(formData).some(key => !areValuesEqual(formData[key as keyof typeof formData], currentData[key as keyof typeof currentData]));
    const previousFirstViableYear = plan.firstViableYear;

    let result = { earliestPurchaseYear: 0, message: "" };
    let customMessage = "";
    
    if (hasChanged) {
      await db.$transaction([
        db.plan.update({
            where: { id: plan.id },
            data: formData,
        })
      ]);
      result = await runProjectionWithEngine(plan.id);
      if (result.earliestPurchaseYear === 0) {
        customMessage = "Rất tiếc, bạn sẽ không thể mua được nhà vào năm mong muốn. Tuy nhiên, bạn vẫn còn cơ hội. Tiếp tục tìm hiểu nhé?💪"
      } else if (result.earliestPurchaseYear > existingResult.earliestPurchaseYear) {
        customMessage = "Với những chi phí này, thời gian mua nhà sớm nhất của bạn sẽ bị lùi lại 😞"
      } else {
        customMessage = `Ấn tượng đấy 😀`;
      }
      await db.planReport.update({
        where: { id: plan.id },
        data: { projectionCache: result }
      });
      await db.plan.update({
        where: { id: plan.id },
        data: { firstViableYear: result.earliestPurchaseYear }
      });
    } else {
      result = existingResult;
      if (result.earliestPurchaseYear === 0) {
        customMessage = "Rất tiếc, bạn sẽ không thể mua được nhà vào năm mong muốn.";
      } else {
        customMessage = "Ấn tượng đấy 😀";
      }
    }

    revalidatePath(`/plan/${plan.id}`);
    return { 
      planId: plan.id,
      plan: plan,
      success: true, 
      earliestPurchaseYear: result.earliestPurchaseYear,
      message: customMessage,
      hasWorsened: previousFirstViableYear && result.earliestPurchaseYear > previousFirstViableYear
    };

  } catch (error) {
    logger.error("[ACTION_ERROR] Failed to update and recalculate (Spending)", { error: String(error) });
    return { success: false, error: "Đã có lỗi xảy ra phía máy chủ." };
  }
}