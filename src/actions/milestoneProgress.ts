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

      // Debug: Log milestoneGroups trước khi lưu
      console.log("=== DEBUG: MilestoneGroups before saving ===");
      milestoneGroups.forEach((group, groupIndex) => {
        console.log(`Group ${group.id}:`);
        group.milestones.forEach((milestone, milestoneIndex) => {
          console.log(`  Milestone ${milestoneIndex + 1}: ${milestone.title}`);
          console.log(`    amountValue: ${milestone.amountValue}`);
          console.log(`    status: ${milestone.status}`);
          console.log(`    percent: ${milestone.percent}`);
        });
      });

      // Đảm bảo dữ liệu được serialize đúng cách
      const serializedMilestoneGroups = JSON.parse(JSON.stringify(milestoneGroups));
      
      // Debug: Log sau khi serialize
      console.log("=== DEBUG: After JSON serialization ===");
      console.log(JSON.stringify(serializedMilestoneGroups, null, 2));

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

      // Debug: Log dữ liệu đã lưu
      console.log("=== DEBUG: Data saved to database ===");
      console.log("Saved milestoneGroups:", JSON.stringify(progress.milestoneGroups, null, 2));
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
    // Debug: Log dữ liệu đầu vào
    console.log("=== DEBUG: updateMilestoneProgress input ===");
    console.log("planId:", planId);
    console.log("data:", JSON.stringify(data, null, 2));

    // Xử lý milestoneGroups đặc biệt để đảm bảo amountValue được giữ lại
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

    // Debug: Log dữ liệu sau khi xử lý
    console.log("=== DEBUG: processedData ===");
    console.log("processedData.milestoneGroups:", JSON.stringify(processedData.milestoneGroups, null, 2));

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

    // Debug: Log kết quả sau khi lưu
    console.log("=== DEBUG: After upsert ===");
    console.log("Result milestoneGroups:", JSON.stringify(progress.milestoneGroups, null, 2));

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

    // Debug: Log milestoneGroups trong recalculate
    console.log("=== DEBUG: recalculateMilestoneProgress ===");
    console.log("milestoneGroups:", JSON.stringify(milestoneGroups, null, 2));

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

    // Tính toán currentSavings mới
    const newCurrentSavings = Math.max(0, currentProgress.currentSavings + amount);
    
    // Tính toán savingsPercentage mới
    const newSavingsPercentage = currentProgress.housePriceProjected > 0 
      ? Math.round((newCurrentSavings / currentProgress.housePriceProjected) * 100)
      : 0;

    // Cập nhật milestone progress
    const updatedProgress = await db.milestoneProgress.update({
      where: { planId },
      data: {
        currentSavings: newCurrentSavings,
        savingsPercentage: newSavingsPercentage,
        lastProgressUpdate: new Date(),
      },
    });

    console.log(`Updated currentSavings: ${currentProgress.currentSavings} -> ${newCurrentSavings} (change: ${amount})`);
    
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

    // Tìm milestone đã hoàn thành và tính toán bonus
    const completedMilestone = milestoneGroups
      .flatMap(group => group.milestones)
      .find(milestone => {
        // Tìm milestone dựa trên milestoneId hoặc amountValue
        const goalNumber = milestone.title.match(/Goal (\d+)/)?.[1];
        return goalNumber && parseInt(goalNumber) === milestoneId;
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