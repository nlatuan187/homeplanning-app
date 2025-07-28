'use server';

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";

export async function updatePlaygroundValue(planId: string, field: string, value: number) {
  try {
    await db.plan.update({
      where: { id: planId },
      data: {
        [field]: value,
      },
    });
  } catch (err) {
    console.error("Error updating playground:", err);
  }
}

type InteractionLogEntry = {
  timestamp: string;
  type: 'interaction_start' | 'initial_change' | 'reset_to_initial' | 'final_submit';
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
      select: {
        userId: true,
        playgroundInteractionLog: true,
      },
    });

    if (!plan || plan.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Lấy log hiện tại
    let currentLog: InteractionLogEntry[] = [];

    if (Array.isArray(plan.playgroundInteractionLog)) {
      currentLog = plan.playgroundInteractionLog as InteractionLogEntry[];
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