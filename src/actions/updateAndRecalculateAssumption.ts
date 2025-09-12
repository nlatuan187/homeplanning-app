"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import logger from "@/lib/logger";
import { runProjectionWithEngine } from "./projectionHelpers";

const areValuesEqual = (val1: any, val2: any) => {
  // Treat null, undefined, and 0 as equal for numeric fields
  if ((val1 === null || val1 === undefined) && (val2 === null || val2 === undefined)) {
    return true;
  }
  return val1 === val2;
};

export async function updateAndRecalculateAssumption(
  planId: string,
  formData: any
) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const plan = await db.plan.findUnique({ where: { id: planId, userId: user.id } });
    if (!plan) return { success: false, error: "Plan not found." };

    const planReport = await db.planReport.findUnique({ where: { planId } });
    const existingResult = planReport?.projectionCache as unknown as { earliestPurchaseYear: number; message: string; };

    const currentData = {
      pctSalaryGrowth: plan.pctSalaryGrowth,
      pctHouseGrowth: plan.pctHouseGrowth,
      pctInvestmentReturn: plan.pctInvestmentReturn,
    };

    const hasChanged = Object.keys(currentData).some(key => !areValuesEqual(currentData[key as keyof typeof currentData], formData[key as keyof typeof formData]));

    let result;
    if (hasChanged) {
      await db.$transaction([
        db.plan.update({
            where: { id: planId },
            data: formData,
        }),
      ]);
      result = await runProjectionWithEngine(planId);
      await db.$transaction([
        db.planReport.upsert({
            where: { planId: plan.id },
            update: { projectionCache: result },
            create: { planId: plan.id, projectionCache: result },
        })
      ]);
      await db.plan.update({
        where: { id: planId },
        data: { firstViableYear: result.earliestPurchaseYear }
    });
    } else {
      result = existingResult;
    }

    revalidatePath(`/plan/${planId}`);
    return { success: true, ...result };

  } catch (error) {
    logger.error("[ACTION_ERROR] Failed to update and recalculate (FamilySupport)", { error: String(error) });
    return { success: false, error: "Đã có lỗi xảy ra phía máy chủ." };
  }
}
