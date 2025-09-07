"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { buildPlanForProjection, computeOnboardingOutcome } from "./projectionHelpers";
import logger from "@/lib/logger";
import { ProjectionRow } from "@/lib/calculations/affordability";
import { generateProjections, PlanWithDetails } from "@/lib/calculations/projections/generateProjections";

async function runProjectionWithEngine(planId: string): Promise<{ projections: ProjectionRow[]; earliestPurchaseYear: number; message: string; }> {
  const enginePlan = await buildPlanForProjection(planId);
  const plan = await db.plan.findUnique({ where: { id: planId } });
  const outcome = await computeOnboardingOutcome(enginePlan);
  return outcome;
}

export async function updateAndRecalculateAssumption(
  planId: string,
  formData: any
) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const plan = await db.plan.findUnique({ where: { id: planId, userId: user.id } });
    if (!plan) return { success: false, error: "Plan not found." };

    const assumptionData = {
        pctSalaryGrowth: formData.pctSalaryGrowth,
        pctHouseGrowth: formData.pctHouseGrowth,
        pctInvestmentReturn: formData.pctInvestmentReturn,
    };
    
    // 2. Use a transaction to update both tables
    await db.$transaction([
        db.plan.update({
            where: { id: planId },
            data: assumptionData,
        }),
    ]);

    const result = await runProjectionWithEngine(planId);

    await db.plan.update({
        where: { id: planId },
        data: { firstViableYear: result.earliestPurchaseYear }
    });

    revalidatePath(`/plan/${planId}`);
    return { success: true, ...result };

  } catch (error) {
    logger.error("[ACTION_ERROR] Failed to update and recalculate (FamilySupport)", { error: String(error) });
    return { success: false, error: "Đã có lỗi xảy ra phía máy chủ." };
  }
}
