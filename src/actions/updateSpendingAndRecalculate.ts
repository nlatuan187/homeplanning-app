"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { Plan } from "@prisma/client";
import { buildPlanForProjection, computeOnboardingOutcome } from "./projectionHelpers";
import logger from "@/lib/logger";

async function runProjectionWithEngine(planId: string): Promise<{ earliestPurchaseYear: number; message: string; }> {
  const enginePlan = await buildPlanForProjection(planId);
  const outcome = await computeOnboardingOutcome(enginePlan);
  return { earliestPurchaseYear: outcome.earliestPurchaseYear, message: outcome.message };
}

export async function updateSpendingAndRecalculate(
  planId: string,
  formData: any
) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const plan = await db.plan.findUnique({ where: { id: planId, userId: user.id } });
    if (!plan) return { success: false, error: "Plan not found." };

    const previousFirstViableYear = plan.firstViableYear;

    const spendingData = {
        monthlyNonHousingDebt: formData.monthlyNonHousingDebt,
        currentAnnualInsurancePremium: formData.currentAnnualInsurancePremium,
    };
    
    // 2. Use a transaction to update both tables
    await db.$transaction([
        db.plan.update({
            where: { id: planId },
            data: spendingData,
        }),
    ]);

    const result = await runProjectionWithEngine(planId);

    await db.plan.update({
        where: { id: planId },
        data: { firstViableYear: result.earliestPurchaseYear }
    });

    const newFirstViableYear = result.earliestPurchaseYear;
    let customMessage = "";

    if (previousFirstViableYear && newFirstViableYear > previousFirstViableYear) {
      // Năm mua nhà bị lùi lại
      customMessage = "Với những chi phí này, thời gian mua nhà sớm nhất của bạn sẽ bị lùi lại 😞";
    } else {
      // Năm mua nhà không thay đổi  
      customMessage = "Ấn tượng đấy 😀";
    }

    revalidatePath(`/plan/${planId}`);
    return { 
      success: true, 
      earliestPurchaseYear: result.earliestPurchaseYear,
      message: customMessage,
      hasWorsened: previousFirstViableYear && newFirstViableYear > previousFirstViableYear
    };

  } catch (error) {
    logger.error("[ACTION_ERROR] Failed to update and recalculate (Spending)", { error: String(error) });
    return { success: false, error: "Đã có lỗi xảy ra phía máy chủ." };
  }
}

