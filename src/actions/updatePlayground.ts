'use server';

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";

export async function updatePlaygroundValue(
  planId: string,
  field: string,
  value: string | number
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Cập nhật giá trị cụ thể (debounced từ frontend)
    await db.plan.update({
      where: { id: planId, userId },
      data: { [field]: value },
    });
  } catch (err) {
    console.error("[PLAYGROUND_UPDATE_ERROR]", err);
  }
}

export async function updatePlaygroundValues(
  planId: string,
  updates: Record<string, string | number>
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await db.plan.update({
      where: { id: planId, userId },
      data: updates, // update nhiều trường
    });
  } catch (err) {
    console.error("[PLAYGROUND_UPDATE_ERROR]", err);
  }
}