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

type InteractionLogEntry = {
  timestamp: string;
  type:
  | "interaction_start"
  | "initial_change"
  | "reset_to_initial"
  | "final_submit";
  initialValues?: Record<string, any>;
};

export async function updateInteractionLog(
  planId: string,
  newEntry: InteractionLogEntry
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const plan = await db.plan.findUnique({
      where: { id: planId },
      select: { userId: true, playgroundInteractionLog: true },
    });

    if (!plan || plan.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Lấy log hiện tại
    let currentLog: InteractionLogEntry[] = [];
    if (Array.isArray(plan.playgroundInteractionLog)) {
      currentLog = plan.playgroundInteractionLog as InteractionLogEntry[];
    }

    // Không ghi log trùng liên tiếp
    if (
      currentLog.length > 0 &&
      currentLog[currentLog.length - 1].type === newEntry.type
    ) {
      return;
    }

    // Giới hạn số log (ví dụ giữ 50 entry gần nhất)
    if (currentLog.length > 50) {
      currentLog = currentLog.slice(-50);
    }

    currentLog.push({
      ...newEntry,
      timestamp: new Date().toISOString(),
    });

    await db.plan.update({
      where: { id: planId },
      data: {
        playgroundInteractionLog: currentLog as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("[INTERACTION_LOG_ERROR]", error);
    throw error;
  }
}