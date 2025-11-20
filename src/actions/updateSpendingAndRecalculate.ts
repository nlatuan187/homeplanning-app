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
    const existingResult = planReport?.projectionCache as unknown as { earliestPurchaseYear: number; message: string; isAffordable: boolean; };

    const currentData = {
      monthlyNonHousingDebt: plan.monthlyNonHousingDebt,
      currentAnnualInsurancePremium: plan.currentAnnualInsurancePremium,
      hasNewChild: plan.hasNewChild,
      yearToHaveChild: plan.yearToHaveChild,
      monthlyChildExpenses: plan.monthlyChildExpenses,
    };

    const hasChanged = Object.keys(formData).some(key => !areValuesEqual(formData[key as keyof typeof formData], currentData[key as keyof typeof currentData]));
    const previousFirstViableYear = plan.firstViableYear;

    let result = { earliestPurchaseYear: 0, message: "", isAffordable: false };
    let customMessage = "";
    let caseNumber: number = 0;

    if (hasChanged) {
      await db.$transaction([
        db.plan.update({
          where: { id: plan.id },
          data: formData,
        })
      ]);
      result = await runProjectionWithEngine(plan.id);

      console.log("DEBUG:", {
        hasChanged,
        earliestPurchaseYear: result.earliestPurchaseYear,
        existingEarliestYear: existingResult.earliestPurchaseYear,
        isAffordable: result.isAffordable,
        formData,
        currentData
      });

      if (result.earliestPurchaseYear === 0) {
        customMessage = "Chi tiêu rất ấn tượng đấy 😀"
        caseNumber = 4;
      } else if (result.earliestPurchaseYear > existingResult.earliestPurchaseYear) {
        customMessage = "Với những chi phí này, thời gian mua nhà sớm nhất của bạn sẽ bị lùi lại 🥵"
        caseNumber = 3;
      } else {
        customMessage = `Những khoản chi này càng đưa căn nhà mơ ước của bạn ra xa hơn, bạn chưa thể mua được nhà 😞`;
        caseNumber = 5;
      }
      await db.$transaction([
        db.planReport.upsert({
          where: { planId: plan.id },
          update: { projectionCache: result },
          create: { planId: plan.id, projectionCache: result },
        })
      ]);
      await db.plan.update({
        where: { id: plan.id },
        data: { firstViableYear: result.earliestPurchaseYear }
      });
    } else {
      result = existingResult;
      if (plan.confirmedPurchaseYear && plan.confirmedPurchaseYear < result.earliestPurchaseYear) {
        customMessage = "Rất tiếc, bạn sẽ không thể mua được nhà vào năm mong muốn.";
        caseNumber = 2;
      } else {
        customMessage = "Ấn tượng đấy 😀";
        caseNumber = 1;
      }
    }

    revalidatePath(`/plan/${plan.id}`);
    return {
      caseNumber: caseNumber,
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