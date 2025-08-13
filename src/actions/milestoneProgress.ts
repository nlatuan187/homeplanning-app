"use server";

import { db } from "@/lib/db";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { getMilestonesByGroup, MilestoneGroup } from "@/lib/isMilestoneUnlocked";

export async function getOrCreateMilestoneProgress(planId: string) {
  try {
    // Tìm existing progress
    let progress = await db.milestoneProgress.findUnique({
      where: { planId },
    });

    if (!progress) {
      // Tạo mới nếu chưa có
      const plan = await db.plan.findUnique({
        where: { id: planId },
        include: { familySupport: true },
      });

      if (!plan) {
        throw new Error("Plan not found");
      }

      // Tính toán dữ liệu ban đầu
      const projections = generateProjections(plan);
      const currentYear = new Date().getFullYear();
      const currentProjection = projections.find(p => p.year === currentYear) || projections[0];
      const currentSavings = plan.initialSavings || 0;

      const purchaseProjection = projections.find(p => p.year === plan.confirmedPurchaseYear) || projections[0];

      const milestoneGroups = getMilestonesByGroup(
        plan.createdAt.getFullYear() + (plan.createdAt.getMonth() + 1) / 12,
        plan.confirmedPurchaseYear ?? 0 + (plan.createdAt.getMonth() + 1) / 12,
        purchaseProjection.housePriceProjected,
        currentSavings,
        plan // Thêm plan parameter
      );

      // Đảm bảo dữ liệu được serialize đúng cách
      const serializedMilestoneGroups = JSON.parse(JSON.stringify(milestoneGroups));

      progress = await db.milestoneProgress.create({
        data: {
          planId,
          currentSavings,
          housePriceProjected: purchaseProjection.housePriceProjected,
          savingsPercentage: Math.round((currentSavings / purchaseProjection.housePriceProjected) * 100),
          milestoneGroups: serializedMilestoneGroups,
          lastMilestoneCalculation: new Date(),
        },
      });
    }

    return progress;
  } catch (error) {
    console.error("Error getting milestone progress:", error);
    throw error;
  }
}

export async function updateMilestoneProgress(planId: string, data: Partial<{
  currentSavings: number;
  selectedMilestoneId: number;
  totalCompletedMilestones: number;
  savingsPercentage: number;
  housePriceProjected: number;
  milestoneGroups: MilestoneGroup[];
  currentMilestoneData: any;
  completedMilestones: any;
  planPageData: any;
}>) {
  try {
    const processedData = {
      ...data,
      milestoneGroups: data.milestoneGroups ? 
        JSON.parse(JSON.stringify(data.milestoneGroups)) : undefined,
      currentMilestoneData: data.currentMilestoneData ? 
        JSON.parse(JSON.stringify(data.currentMilestoneData)) : undefined,
      completedMilestones: data.completedMilestones ? 
        JSON.parse(JSON.stringify(data.completedMilestones)) : undefined,
      planPageData: data.planPageData ? 
        JSON.parse(JSON.stringify(data.planPageData)) : undefined,
    };

    const progress = await db.milestoneProgress.upsert({
      where: { planId },
      update: {
        ...processedData,
        lastProgressUpdate: new Date(),
      },
      create: {
        planId,
        ...processedData,
        lastProgressUpdate: new Date(),
      },
    });

    return progress;
  } catch (error) {
    console.error("Error updating milestone progress:", error);
    throw error;
  }
}

export async function recalculateMilestoneProgress(planId: string) {
  try {
    const plan = await db.plan.findUnique({
      where: { id: planId },
      include: { familySupport: true },
    });

    if (!plan) {
      throw new Error("Plan not found");
    }

    const projections = generateProjections(plan);
    const currentYear = new Date().getFullYear();
    const currentProjection = projections.find(p => p.year === currentYear) || projections[0];
    const currentSavings = plan.initialSavings || 0;

    const purchaseProjection = projections.find(p => p.year === plan.confirmedPurchaseYear) || projections[0];

    const milestoneGroups = getMilestonesByGroup(
      plan.createdAt.getFullYear() + (plan.createdAt.getMonth() + 1) / 12,
      plan.confirmedPurchaseYear ?? 0 + (plan.createdAt.getMonth() + 1) / 12,
      purchaseProjection.housePriceProjected,
      currentSavings,
      plan // Thêm plan parameter
    );

    const progress = await db.milestoneProgress.upsert({
      where: { planId },
      update: {
        currentSavings,
        housePriceProjected: purchaseProjection.housePriceProjected,
        savingsPercentage: Math.round((currentSavings / purchaseProjection.housePriceProjected) * 100),
        milestoneGroups: JSON.parse(JSON.stringify(milestoneGroups)),
        lastMilestoneCalculation: new Date(),
      },
      create: {
        planId,
        currentSavings,
        housePriceProjected: purchaseProjection.housePriceProjected,
        savingsPercentage: Math.round((currentSavings / purchaseProjection.housePriceProjected) * 100),
        milestoneGroups: JSON.parse(JSON.stringify(milestoneGroups)),
        lastMilestoneCalculation: new Date(),
      },
    });

    return progress;
  } catch (error) {
    console.error("Error recalculating milestone progress:", error);
    throw error;
  }
} 

export async function updateCurrentSavings(planId: string, amount: number) {
  try {
    // Lấy milestone progress hiện tại
    const currentProgress = await db.milestoneProgress.findUnique({
      where: { planId },
    });

    if (!currentProgress) {
      throw new Error("Milestone progress not found");
    }

    // Cập nhật currentSavings (amount có thể âm hoặc dương)
    const newCurrentSavings = currentProgress.currentSavings + amount;
    
    // Đảm bảo currentSavings không âm
    const finalCurrentSavings = Math.max(0, newCurrentSavings);
    
    const newSavingsPercentage = currentProgress.housePriceProjected > 0 
      ? Math.round((finalCurrentSavings / currentProgress.housePriceProjected) * 100)
      : 0;

    const updatedProgress = await db.milestoneProgress.update({
      where: { planId },
      data: {
        currentSavings: finalCurrentSavings,
        savingsPercentage: newSavingsPercentage,
        lastProgressUpdate: new Date(),
      },
    });

    console.log(`Current savings updated: ${currentProgress.currentSavings} -> ${finalCurrentSavings} (change: ${amount})`);
    
    return updatedProgress;
  } catch (error) {
    console.error("Error updating current savings:", error);
    throw error;
  }
}

export async function updateMilestoneProgressOnCompletion(planId: string, milestoneId: number) {
  try {
    // Lấy milestone progress hiện tại
    const currentProgress = await db.milestoneProgress.findUnique({
      where: { planId },
    });

    if (!currentProgress) {
      throw new Error("Milestone progress not found");
    }

    // Parse milestoneGroups để tìm milestone đã hoàn thành
    const milestoneGroups = currentProgress.milestoneGroups 
      ? (typeof currentProgress.milestoneGroups === 'string' 
          ? JSON.parse(currentProgress.milestoneGroups) 
          : currentProgress.milestoneGroups) as MilestoneGroup[]
      : [];

    // Tìm milestone đã hoàn thành dựa trên milestoneId
    // Thay vì tìm theo title, tìm theo groupId trong milestoneGroups
    const completedMilestone = milestoneGroups
      .flatMap(group => group.milestones)
      .find(milestone => {
        // Tìm milestone dựa trên groupId thay vì title
        // milestoneId tương ứng với group.id
        return milestone.groupId === milestoneId;
      });

    if (completedMilestone && completedMilestone.amountValue) {
      // Tính toán bonus khi hoàn thành milestone (ví dụ: 5% của amountValue)
      const milestoneBonus = Math.round(completedMilestone.amountValue * 0.05);
      
      // Cập nhật currentSavings với bonus
      const newCurrentSavings = currentProgress.currentSavings + milestoneBonus;
      const newSavingsPercentage = currentProgress.housePriceProjected > 0 
        ? Math.round((newCurrentSavings / currentProgress.housePriceProjected) * 100)
        : 0;

      // Cập nhật totalCompletedMilestones
      const newTotalCompletedMilestones = currentProgress.totalCompletedMilestones + 1;

      const updatedProgress = await db.milestoneProgress.update({
        where: { planId },
        data: {
          currentSavings: newCurrentSavings,
          savingsPercentage: newSavingsPercentage,
          totalCompletedMilestones: newTotalCompletedMilestones,
          lastProgressUpdate: new Date(),
        },
      });

      console.log(`Milestone ${milestoneId} completed! Added bonus: ${milestoneBonus.toLocaleString()}đ`);
      
      return updatedProgress;
    }

    return currentProgress;
  } catch (error) {
    console.error("Error updating milestone progress on completion:", error);
    throw error;
  }
} 

// Action để lưu custom user tasks cho milestone
export async function saveCustomTask(
  planId: string,
  milestoneId: number,
  task: {
    text: string;
    type: "user" | "system";
    status: "incomplete" | "completed" | "auto-completed";
    amount?: number;
  }
) {
  try {
    // Lấy milestone progress hiện tại
    const progress = await getOrCreateMilestoneProgress(planId);
    
    // Lấy planPageData hiện tại hoặc tạo mới
    const planPageData = progress.planPageData as any || {};
    
    // Khởi tạo structure cho custom tasks nếu chưa có
    if (!planPageData.customTasks) {
      planPageData.customTasks = {};
    }
    
    if (!planPageData.customTasks[milestoneId]) {
      planPageData.customTasks[milestoneId] = [];
    }
    
    // Thêm task mới với timestamp để tránh duplicate
    const newTask = {
      ...task,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID
      createdAt: new Date().toISOString(),
    };
    
    planPageData.customTasks[milestoneId].push(newTask);
    
    // Cập nhật database
    const updatedProgress = await updateMilestoneProgress(planId, {
      planPageData: planPageData,
    });
    
    console.log("✅ Custom task saved:", newTask);
    return { success: true, task: newTask, progress: updatedProgress };
    
  } catch (error) {
    console.error("Error saving custom task:", error);
    throw error;
  }
}

// Action để lấy custom tasks cho milestone
export async function getCustomTasks(planId: string, milestoneId: number) {
  try {
    const progress = await getOrCreateMilestoneProgress(planId);
    const planPageData = progress.planPageData as any || {};
    
    return planPageData.customTasks?.[milestoneId] || [];
  } catch (error) {
    console.error("Error getting custom tasks:", error);
    return [];
  }
}

// Action để cập nhật status của custom task
export async function updateCustomTaskStatus(
  planId: string,
  milestoneId: number,
  taskId: string,
  newStatus: "incomplete" | "completed" | "auto-completed"
) {
  try {
    const progress = await getOrCreateMilestoneProgress(planId);
    const planPageData = progress.planPageData as any || {};
    
    if (!planPageData.customTasks?.[milestoneId]) {
      throw new Error("No custom tasks found for this milestone");
    }
    
    // Tìm và cập nhật task
    const tasks = planPageData.customTasks[milestoneId];
    const taskIndex = tasks.findIndex((t: any) => t.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error("Task not found");
    }
    
    tasks[taskIndex].status = newStatus;
    tasks[taskIndex].updatedAt = new Date().toISOString();
    
    // Cập nhật database
    const updatedProgress = await updateMilestoneProgress(planId, {
      planPageData: planPageData,
    });
    
    console.log("✅ Custom task status updated:", { taskId, newStatus });
    return { success: true, progress: updatedProgress };
    
  } catch (error) {
    console.error("Error updating custom task status:", error);
    throw error;
  }
} 