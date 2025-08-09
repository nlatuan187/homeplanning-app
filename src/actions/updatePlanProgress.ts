"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { updateMilestoneProgress } from "./milestoneProgress";

export async function updatePlanProgress(
  planId: string,
  data: {
    currentSavings?: number;
    selectedMilestoneId?: number;
    totalCompletedMilestones?: number;
    milestoneGroups?: any;
    currentMilestoneData?: any;
    completedMilestones?: any;
    planPageData?: any;
  }
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Kiểm tra quyền truy cập plan
    const plan = await db.plan.findUnique({
      where: { id: planId },
      select: { userId: true },
    });

    if (!plan || plan.userId !== userId) {
      throw new Error("Forbidden");
    }

    // Cập nhật milestone progress
    await updateMilestoneProgress(planId, data);

    return { success: true };
  } catch (error) {
    console.error("Error updating plan progress:", error);
    throw error;
  }
}

// Action để lưu milestone data khi click từ roadmap
export async function saveMilestoneData(
  planId: string,
  milestoneData: {
    milestoneId: number;
    title: string;
    status: string;
    percent?: number;
    amountValue?: number | null;
    currentSavings: number;
    lastDoneAmountValue: number;
    progress: number;
  }
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Kiểm tra quyền truy cập plan
    const plan = await db.plan.findUnique({
      where: { id: planId },
      select: { userId: true },
    });

    if (!plan || plan.userId !== userId) {
      throw new Error("Forbidden");
    }

    // Cập nhật current milestone data
    await updateMilestoneProgress(planId, {
      selectedMilestoneId: milestoneData.milestoneId,
      currentMilestoneData: milestoneData,
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving milestone data:", error);
    throw error;
  }
} 