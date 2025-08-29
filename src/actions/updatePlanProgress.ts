"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { 
  updateMilestoneProgress as updateMilestoneProgressAction, 
  syncMilestoneTasks 
} from "./milestoneProgress";

export async function updatePlanProgress(
  planId: string,
  data: {
    tasks?: any[];
    currentSavings?: number;
    milestoneIdentifier?: string;
    allTasksCompleted?: boolean;
    completedAmount?: number;
    nextMilestoneIdentifier?: string | null;
    updatedMilestoneGroups?: any[];
  }
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const plan = await db.plan.findUnique({
      where: { id: planId },
      select: { userId: true },
    });

    if (!plan || plan.userId !== userId) {
      throw new Error("Forbidden");
    }

    // Logic mới: Phân loại hành động dựa trên dữ liệu được gửi lên
    if (data.tasks && typeof data.currentSavings !== 'undefined') {
      // Đây là hành động đồng bộ tasks và savings
      await syncMilestoneTasks(planId, data.tasks, data.currentSavings);
    } else if (
      data.milestoneIdentifier && 
      typeof data.allTasksCompleted !== 'undefined' &&
      typeof data.currentSavings !== 'undefined' &&
      typeof data.completedAmount !== 'undefined' &&
      typeof data.nextMilestoneIdentifier !== 'undefined' &&
      data.updatedMilestoneGroups
    ) {
      // Đây là hành động hoàn thành một cột mốc
      await updateMilestoneProgressAction(
        planId,
        data.milestoneIdentifier,
        data.allTasksCompleted,
        data.currentSavings,
        data.completedAmount,
        data.nextMilestoneIdentifier,
        data.updatedMilestoneGroups
      );
    } else {
      // Nếu không khớp với kịch bản nào, báo lỗi
      throw new Error("Invalid data structure for updating plan progress.");
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating plan progress:", error);
    throw error;
  }
}

// Action này không còn cần thiết vì logic đã được tích hợp ở client
// và gọi trực tiếp các action cụ thể hơn.
// Bạn có thể cân nhắc xóa nó đi.
export async function saveMilestoneData(
  planId: string,
  milestoneData: any
) {
  // ... (giữ nguyên hoặc xóa)
  console.warn("saveMilestoneData is deprecated and should be removed.");
  return { success: true };
} 