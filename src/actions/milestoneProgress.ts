"use server";

import { db } from "@/lib/db";
import { generateProjections, PlanWithDetails } from "@/lib/calculations/projections/generateProjections";
import { getMilestonesByGroup, MilestoneGroup } from "@/lib/isMilestoneUnlocked";
import { revalidatePath } from "next/cache";
import { Plan, FamilySupport, PlanReport } from "@prisma/client";
import { Prisma } from '@prisma/client'
import { ProjectionRow } from "@/lib/calculations/affordability";

// Thêm interface TaskItem nếu nó chưa tồn tại
export interface TaskItem {
  id: string;
  text: string;
  type: "system" | "user";
  status: "incomplete" | "completed" | "auto-completed";
  amount?: number;
}

// =================================================================
// BƯỚC 1: TẠO SERVER ACTION MỚI ĐỂ ĐỒNG BỘ TOÀN BỘ TIẾN TRÌNH
// =================================================================
export async function syncMilestoneTasks(
  planId: string,
  tasks: TaskItem[],
  currentSavings: number
): Promise<{ success: boolean }> {
  try {
    const progress = await db.milestoneProgress.findUnique({ where: { planId } });
    const roadmap = await db.planRoadmap.findUnique({ where: { planId } });

    if (!progress) {
      throw new Error("Progress not found.");
    }
    if (!roadmap) {
      throw new Error("Roadmap not found.");
    }

    const newCurrentSavings = Math.max(0, currentSavings);

    let currentData = roadmap.currentMilestoneData as any;
    if (!currentData || typeof currentData !== 'object') {
      currentData = {};
    }
    currentData.items = tasks;
    
    // Cập nhật progress với dữ liệu savings
    await db.milestoneProgress.update({
      where: { planId },
      data: {
        currentSavings: newCurrentSavings,
        savingsPercentage: progress.housePriceProjected > 0
          ? Math.round((newCurrentSavings / progress.housePriceProjected) * 100)
          : 0,
      },
    });

    // Cập nhật roadmap với dữ liệu tasks
    await db.planRoadmap.update({
      where: { planId },
      data: {
        currentMilestoneData: currentData,
      },
    });
    
    console.log(`✅ Synced ${tasks.length} tasks. Savings updated to ${newCurrentSavings} for plan ${planId}`);
    return { success: true };

  } catch (error) {
    console.error("Error syncing milestone tasks:", error);
    throw new Error("Failed to sync milestone tasks to the database.");
  }
}

// Hàm helper mới để tìm cột mốc con "current"
function findCurrentSubMilestone(milestoneGroups: MilestoneGroup[]) {
  for (const group of milestoneGroups) {
    const currentSubMilestone = group.milestones.find(m => m.status === "current");
    if (currentSubMilestone) {
      return {
        milestoneId: group.id,
        title: group.title,
        status: currentSubMilestone.status,
        amountValue: currentSubMilestone.amountValue,
        items: currentSubMilestone.items,
      };
    }
  }
  return null;
}

// Hàm này được tái cấu trúc để lấy hoặc tạo cả progress và roadmap
export async function getOrCreateFullMilestoneData(planId: string, userId: string) {
  try {
    const { plan, projections } = await getProjectionsWithCache(planId, userId);
    
    let progress = await db.milestoneProgress.findUnique({
      where: { planId },
    });

    let roadmap = await db.planRoadmap.findUnique({
      where: { planId },
    });

    const purchaseProjection = projections.find((p: ProjectionRow) => p.year === plan.confirmedPurchaseYear) || projections[0];

    if (!progress) {
      const currentSavings = plan.initialSavings || 0;
      progress = await db.milestoneProgress.create({
        data: {
          planId,
          currentSavings,
          housePriceProjected: purchaseProjection.housePriceProjected,
          savingsPercentage: purchaseProjection.housePriceProjected > 0 ? Math.round((currentSavings / purchaseProjection.housePriceProjected) * 100) : 0,
          lastMilestoneCalculation: new Date(),
        },
      });
    }

    if (!roadmap) {
      const currentSavings = progress.currentSavings; // Lấy savings từ progress đã có
      const purchaseYear = plan.confirmedPurchaseYear ?? (plan.createdAt.getFullYear() + plan.yearsToPurchase);
      const milestoneGroups = getMilestonesByGroup(
        plan.createdAt.getFullYear() + (plan.createdAt.getMonth() + 1) / 12,
        purchaseYear + (plan.createdAt.getMonth() + 1) / 12,
        purchaseProjection.housePriceProjected,
        currentSavings,
        plan,
        projections
      );
      const serializedMilestoneGroups = JSON.parse(JSON.stringify(milestoneGroups));
      const currentMilestoneData = findCurrentSubMilestone(milestoneGroups);

      roadmap = await db.planRoadmap.create({
        data: {
          planId,
          milestoneGroups: serializedMilestoneGroups,
          currentMilestoneData: currentMilestoneData ? JSON.parse(JSON.stringify(currentMilestoneData)) : Prisma.JsonNull,
        },
      });
    }

    return { progress, roadmap };
  } catch (error) {
    console.error("Error getting or creating full milestone data:", error);
    throw error;
  }
}

export async function updateMilestoneProgress(
  planId: string,
  milestoneIdentifier: string,
  allTasksCompleted: boolean,
  currentSavings: number,
  completedAmount: number,
  nextMilestoneIdentifier: string | null,
  updatedMilestoneGroups: any[] 
) {
  try {
    const progress = await db.milestoneProgress.findUnique({ where: { planId } });
    const roadmap = await db.planRoadmap.findUnique({ where: { planId } });

    if (!progress) throw new Error("MilestoneProgress not found");
    if (!roadmap) throw new Error("PlanRoadmap not found");

    const completedMilestones = (Array.isArray(roadmap.completedMilestones) ? roadmap.completedMilestones : []) as Prisma.JsonArray;

    const existingMilestoneIndex = completedMilestones.findIndex(
      (m: any) => m.identifier === milestoneIdentifier
    );

    const milestoneEntry = {
      identifier: milestoneIdentifier,
      allTasksCompleted,
      completedAmount,
      completedAt: new Date().toISOString(), // Chuyển sang ISOString
    };

    if (existingMilestoneIndex !== -1) {
      completedMilestones[existingMilestoneIndex] = milestoneEntry;
    } else {
      completedMilestones.push(milestoneEntry);
    }

    const newCurrentMilestoneData = findCurrentSubMilestone(updatedMilestoneGroups as MilestoneGroup[]);
    const newSavingsPercentage = progress.housePriceProjected > 0
      ? Math.round((currentSavings / progress.housePriceProjected) * 100)
      : 0;

    // Cập nhật 2 bảng riêng biệt
    const updatedProgress = await db.milestoneProgress.update({
      where: { planId },
      data: {
        currentSavings: currentSavings,
        savingsPercentage: newSavingsPercentage,
        lastProgressUpdate: new Date(),
      },
    });

    const updatedRoadmap = await db.planRoadmap.update({
        where: { planId },
        data: {
            milestoneGroups: updatedMilestoneGroups, 
            completedMilestones: completedMilestones,
            currentMilestoneData: newCurrentMilestoneData ? JSON.parse(JSON.stringify(newCurrentMilestoneData)) : Prisma.JsonNull,
        }
    });

    revalidatePath(`/plan/${planId}/plan`);
    return { updatedProgress, updatedRoadmap };
    
  } catch (error) {
    console.error("Error in updateMilestoneProgress:", error);
    throw new Error("Could not update milestone progress");
  }
}

export async function recalculateMilestoneProgress(planId: string, userId: string) {
  try {
    const { plan, projections } = await getProjectionsWithCache(planId, userId);

    const currentSavings = plan.initialSavings || 0;
    const purchaseProjection = projections.find((p: ProjectionRow) => p.year === plan.confirmedPurchaseYear) || projections[0];

    const purchaseYear = plan.confirmedPurchaseYear ?? (plan.createdAt.getFullYear() + plan.yearsToPurchase);
    const milestoneGroups = getMilestonesByGroup(
      plan.createdAt.getFullYear() + (plan.createdAt.getMonth() + 1) / 12,
      purchaseYear + (plan.createdAt.getMonth() + 1) / 12,
      purchaseProjection.housePriceProjected,
      currentSavings,
      plan,
      projections
    );
    const serializedMilestoneGroups = JSON.parse(JSON.stringify(milestoneGroups));
    const currentMilestoneData = findCurrentSubMilestone(milestoneGroups);

    const progressData = {
      currentSavings,
      housePriceProjected: purchaseProjection.housePriceProjected,
      savingsPercentage: purchaseProjection.housePriceProjected > 0 ? Math.round((currentSavings / purchaseProjection.housePriceProjected) * 100) : 0,
      lastMilestoneCalculation: new Date(),
    };

    const roadmapData = {
        milestoneGroups: serializedMilestoneGroups,
        currentMilestoneData: currentMilestoneData ? JSON.parse(JSON.stringify(currentMilestoneData)) : Prisma.JsonNull,
        completedMilestones: [],
        planPageData: {},
    };

    // Upsert cả hai bảng
    const progress = await db.milestoneProgress.upsert({
      where: { planId },
      update: progressData,
      create: { planId, ...progressData },
    });

    await db.planRoadmap.upsert({
        where: { planId },
        update: {
            milestoneGroups: serializedMilestoneGroups,
            currentMilestoneData: currentMilestoneData ? JSON.parse(JSON.stringify(currentMilestoneData)) : Prisma.JsonNull,
        },
        create: { planId, ...roadmapData },
    });

    return progress;
  } catch (error) {
    console.error("Error recalculating milestone progress:", error);
    throw error;
  }
} 

export async function updateCurrentSavings(planId: string, amount: number, userId: string) {
  try {
    const { progress, roadmap } = await getOrCreateFullMilestoneData(planId, userId);
    
    const newCurrentSavings = progress.currentSavings + amount;
    const finalCurrentSavings = Math.max(0, newCurrentSavings);
    
    const newSavingsPercentage = progress.housePriceProjected > 0 
      ? Math.round((finalCurrentSavings / progress.housePriceProjected) * 100)
      : 0;

    let milestoneGroups = (roadmap.milestoneGroups as unknown as MilestoneGroup[]) || [];
    
    let foundCurrent = false;
    const updatedMilestoneGroups = milestoneGroups.map(group => {
      const updatedMilestones = group.milestones.map(milestone => {
        let status: "done" | "current" | "upcoming" = "upcoming";
        if (finalCurrentSavings >= milestone.amountValue) {
          status = "done";
        }
        return { ...milestone, status };
      }).sort((a, b) => a.amountValue - b.amountValue);

      const finalMilestones = updatedMilestones.map(milestone => {
        if (!foundCurrent && milestone.status === "upcoming") {
          foundCurrent = true;
          return { ...milestone, status: "current" as const };
        }
        return milestone;
      });

      const allDone = finalMilestones.every(m => m.status === "done");
      const hasCurrent = finalMilestones.some(m => m.status === "current");
      
      const groupStatus: "done" | "current" | "upcoming" = allDone ? "done" : hasCurrent ? "current" : "upcoming";

      return {
        ...group,
        milestones: finalMilestones,
        status: groupStatus,
      };
    });

    const newCurrentMilestoneData = findCurrentSubMilestone(updatedMilestoneGroups);

    // Cập nhật progress
    const updatedProgress = await db.milestoneProgress.update({
      where: { planId },
      data: {
        currentSavings: finalCurrentSavings,
        savingsPercentage: newSavingsPercentage,
        lastProgressUpdate: new Date(),
      },
    });

    // Cập nhật roadmap
    await db.planRoadmap.update({
        where: { planId },
        data: {
            milestoneGroups: JSON.parse(JSON.stringify(updatedMilestoneGroups)),
            currentMilestoneData: newCurrentMilestoneData ? JSON.parse(JSON.stringify(newCurrentMilestoneData)) : Prisma.JsonNull,
        }
    });

    console.log(`Current savings updated: ${progress.currentSavings} -> ${finalCurrentSavings} (change: ${amount})`);
    
    return updatedProgress;
  } catch (error) {
    console.error("Error updating current savings:", error);
    throw error;
  }
}

// Các hàm custom task cũng được cập nhật tương tự
export async function saveCustomTask(
  planId: string,
  milestoneId: number,
  task: {
    text: string;
    type: "user" | "system";
    status: "incomplete" | "completed" | "auto-completed";
    amount?: number;
  },
  userId: string
) {
  try {
    const { roadmap } = await getOrCreateFullMilestoneData(planId, userId);
    
    const planPageData = (roadmap.planPageData as any) || {};
    
    if (!planPageData.customTasks) {
      planPageData.customTasks = {};
    }
    
    if (!planPageData.customTasks[milestoneId]) {
      planPageData.customTasks[milestoneId] = [];
    }
    
    const newTask = {
      ...task,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    
    planPageData.customTasks[milestoneId].push(newTask);
    
    await db.planRoadmap.update({
      where: { planId },
      data: {
        planPageData: planPageData,
      },
    });
    
    console.log("✅ Custom task saved:", newTask);
    return { success: true, task: newTask };
    
  } catch (error) {
    console.error("Error saving custom task:", error);
    throw error;
  }
}

export async function getCustomTasks(planId: string, milestoneId: number, userId: string) {
  try {
    const { roadmap } = await getOrCreateFullMilestoneData(planId, userId);
    const planPageData = (roadmap.planPageData as any) || {};
    
    return planPageData.customTasks?.[milestoneId] || [];
  } catch (error) {
    console.error("Error getting custom tasks:", error);
    return [];
  }
}

export async function updateCustomTaskStatus(
  planId: string,
  milestoneId: number,
  taskId: string,
  newStatus: "incomplete" | "completed" | "auto-completed",
  userId: string
) {
  try {
    const { progress, roadmap } = await getOrCreateFullMilestoneData(planId, userId);
    const planPageData = (roadmap.planPageData as any) || {};

    if (!planPageData.customTasks?.[milestoneId]) {
      throw new Error("No custom tasks found for this milestone");
    }

    const tasks = planPageData.customTasks[milestoneId];
    const taskIndex = tasks.findIndex((t: any) => t.id === taskId);

    if (taskIndex === -1) {
      throw new Error("Task not found");
    }

    const taskToUpdate = tasks[taskIndex];
    const oldStatus = taskToUpdate.status;

    if (oldStatus === newStatus) {
      return { success: true, progress };
    }

    let amountChange = 0;
    const taskAmount = taskToUpdate.amount || 0;

    if (newStatus === 'completed' && oldStatus !== 'completed') {
      amountChange = taskAmount;
    } else if (newStatus !== 'completed' && oldStatus === 'completed') {
      amountChange = -taskAmount;
    }

    tasks[taskIndex].status = newStatus;
    tasks[taskIndex].updatedAt = new Date().toISOString();

    if (amountChange === 0) {
      await db.planRoadmap.update({
        where: { planId },
        data: { planPageData },
      });
      return { success: true, progress };
    }

    const initialSavings = progress.currentSavings;
    const newCurrentSavings = initialSavings + amountChange;
    const finalCurrentSavings = Math.max(0, newCurrentSavings);

    const newSavingsPercentage =
      progress.housePriceProjected > 0
        ? Math.round((finalCurrentSavings / progress.housePriceProjected) * 100)
        : 0;

    let milestoneGroups = (roadmap.milestoneGroups as unknown as MilestoneGroup[]) || [];
    let foundCurrent = false;
    const updatedMilestoneGroups = milestoneGroups.map(group => {
      const updatedMilestones = group.milestones
        .map(milestone => {
          let status: "done" | "current" | "upcoming" = "upcoming";
          if (finalCurrentSavings >= milestone.amountValue) {
            status = "done";
          }
          return { ...milestone, status };
        })
        .sort((a, b) => a.amountValue - b.amountValue);

      const finalMilestones = updatedMilestones.map(milestone => {
        if (!foundCurrent && milestone.status === "upcoming") {
          foundCurrent = true;
          return { ...milestone, status: "current" as const };
        }
        return milestone;
      });

      const allDone = finalMilestones.every(m => m.status === "done");
      const hasCurrent = finalMilestones.some(m => m.status === "current");
      const groupStatus: "done" | "current" | "upcoming" = allDone ? "done" : hasCurrent ? "current" : "upcoming";

      return {
        ...group,
        milestones: finalMilestones,
        status: groupStatus,
      };
    });

    const newCurrentMilestoneData = findCurrentSubMilestone(updatedMilestoneGroups);

    // Cập nhật cả 2 bảng
    await db.milestoneProgress.update({
      where: { planId },
      data: {
        currentSavings: finalCurrentSavings,
        savingsPercentage: newSavingsPercentage,
        lastProgressUpdate: new Date(),
      },
    });

    const updatedRoadmap = await db.planRoadmap.update({
        where: { planId },
        data: {
            planPageData,
            milestoneGroups: JSON.parse(JSON.stringify(updatedMilestoneGroups)),
            currentMilestoneData: newCurrentMilestoneData ? JSON.parse(JSON.stringify(newCurrentMilestoneData)) : Prisma.JsonNull,
        }
    });

    // Trả về progress mới nhất sau khi cập nhật
    const finalProgress = await db.milestoneProgress.findUnique({ where: { planId } });

    return { success: true, progress: finalProgress };

  } catch (error) {
    console.error("[FATAL ERROR] in updateCustomTaskStatus:", error);
    throw error;
  }
} 

// Định nghĩa một kiểu dữ liệu cụ thể hơn cho đối tượng plan mà hàm này trả về
type PlanWithCacheAndSupport = Plan & {
  planReport: {
    projectionCache: any;
  } | null;
  familySupport: FamilySupport | null;
};

/**
 * Lấy dữ liệu dự báo tài chính cho một kế hoạch.
 * Hàm sẽ ưu tiên lấy dữ liệu từ cache (`planReport.projectionCache`).
 * Nếu không có cache, nó sẽ tạo ra dữ liệu dự báo mới, lưu lại vào cache,
 * và sau đó trả về.
 *
 * @param {string} planId - ID của kế hoạch.
 * @param {string} userId - ID của người dùng sở hữu kế hoạch.
 * @returns {Promise<{ plan: PlanWithCacheAndSupport, projections: ProjectionRow[] }>} - Một đối tượng chứa plan đầy đủ và dữ liệu dự báo.
 */
export async function getProjectionsWithCache(planId: string, userId: string): Promise<{ plan: PlanWithCacheAndSupport, projections: ProjectionRow[] }> {
  const plan = await db.plan.findUnique({
    where: { id: planId, userId },
    include: {
      familySupport: true,
    },
  });

  const planReport = await db.planReport.findUnique({
    where: { planId },
    select: {
      projectionCache: true,
    },
  });

  if (!plan) {
    throw new Error("Plan not found");
  }

  return { plan: plan as PlanWithCacheAndSupport, projections: planReport?.projectionCache as unknown as ProjectionRow[] };
} 