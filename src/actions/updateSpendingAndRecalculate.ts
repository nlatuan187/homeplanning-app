"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { runProjectionWithEngine } from "./projectionHelpers";
import logger from "@/lib/logger";
import { OnboardingPlanState } from "@/components/onboarding/types";

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

    const previousFirstViableYear = plan.firstViableYear;

    let result = { earliestPurchaseYear: 0, message: "", isAffordable: false };
    let customMessage = "";
    let caseNumber: number = 0;

    await db.$transaction([
      db.plan.update({
        where: { id: plan.id },
        data: formData,
      })
    ]);
    result = await runProjectionWithEngine(plan.id);
    const existingEarliestYear = existingResult?.earliestPurchaseYear || 0;

    if (result.earliestPurchaseYear === 0) {
      customMessage = "Rất tiếc, bạn vẫn sẽ không thể mua được nhà vào năm mong muốn 😞.";
      caseNumber = 2;
    } else if (existingEarliestYear !== 0 && result.earliestPurchaseYear === existingEarliestYear) {
      customMessage = "Ấn tượng đấy 😀";
      caseNumber = 1;
    } else if (result.earliestPurchaseYear > existingEarliestYear) {
      customMessage = "Với những chi phí này, thời gian mua nhà sớm nhất của bạn sẽ bị lùi lại 🥵";
      caseNumber = 3;
    } else {
      customMessage = "Sự hỗ trợ từ gia đình và chi tiêu rất ấn tượng đấy 😀";
      caseNumber = 4;
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