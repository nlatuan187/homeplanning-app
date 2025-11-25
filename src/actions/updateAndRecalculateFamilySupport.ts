"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import logger from "@/lib/logger";

export async function updateAndRecalculateFamilySupport(
  planId: string,
  formData: any,
) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const plan = await db.plan.findUnique({ where: { id: planId, userId: user.id } });
    if (!plan) return { success: false, error: "Plan not found." };

    await db.$transaction([
      db.planFamilySupport.upsert({
        where: { planId },
        update: formData,
        create: { planId, ...formData },
      })
    ]);

    revalidatePath(`/plan/${planId}`);
    return {
      plan: plan,
      success: true,
    };

  } catch (error) {
    logger.error("[ACTION_ERROR] Failed to update and recalculate (FamilySupport)", { error: String(error) });
    return { success: false, error: "Đã có lỗi xảy ra phía máy chủ." };
  }
}
