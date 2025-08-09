'use server';

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { getMilestonesByGroup } from "@/lib/isMilestoneUnlocked";

// Schema để validate assumptions
const assumptionSchema = z.object({
  pctSalaryGrowth: z.number(),
  pctInvestmentReturn: z.number(),
  monthlyLivingExpenses: z.number(),
  monthlyOtherIncome: z.number(),
});

export async function confirmPlaygroundAssumptions(
  planId: string,
  newAssumptions: z.infer<typeof assumptionSchema>,
  interactionLog: any[]
) {
  // 1. Xác thực người dùng
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // 2. Kiểm tra quyền truy cập plan
  const plan = await db.plan.findUnique({
    where: { id: planId },
    include: { familySupport: true },
  });

  if (!plan || plan.userId !== userId) {
    throw new Error("Forbidden");
  }

  // 3. Validate assumptions
  const parsed = assumptionSchema.safeParse(newAssumptions);
  if (!parsed.success) {
    throw new Error("Invalid assumptions");
  }

  // 4. Cập nhật plan với assumptions mới
  const updatedPlan = await db.plan.update({
    where: { id: planId },
    data: {
      ...parsed.data,
      playgroundInteractionLog: interactionLog, // ghi lại log đã tổng hợp ở frontend
      reportGeneratedAt: null, // Reset báo cáo cũ
    },
  });

  // 5. Tạo hoặc cập nhật milestoneProgress
  const projections = generateProjections(updatedPlan);
  const currentSavings = plan.initialSavings || 0;

  const purchaseProjection = projections.find(p => p.year === updatedPlan.confirmedPurchaseYear) || projections[0];

  const milestoneGroups = getMilestonesByGroup(
    updatedPlan.createdAt.getFullYear() + (updatedPlan.createdAt.getMonth() + 1) / 12,
    updatedPlan.confirmedPurchaseYear ?? 0 + (updatedPlan.createdAt.getMonth() + 1) / 12,
    purchaseProjection.housePriceProjected,
    currentSavings,
    updatedPlan // Thêm plan parameter
  );

  // Tìm milestone đầu tiên có status "current" để làm currentMilestoneData
  let currentMilestoneData = null;
  for (const group of milestoneGroups) {
    const currentMilestone = group.milestones.find(m => m.status === "current");
    if (currentMilestone) {
      currentMilestoneData = {
        milestoneId: group.id,
        title: currentMilestone.title,
        status: currentMilestone.status,
        percent: currentMilestone.percent,
        amountValue: currentMilestone.amountValue,
        currentSavings: currentSavings,
        lastDoneAmountValue: 0, // Vì đây là milestone đầu tiên
        progress: 0,
      };
      break; // Chỉ lấy milestone đầu tiên có status "current"
    }
  }

  // Tạo hoặc cập nhật milestoneProgress
  await db.milestoneProgress.upsert({
    where: { planId },
    update: {
      currentSavings,
      housePriceProjected: purchaseProjection.housePriceProjected,
      savingsPercentage: Math.round((currentSavings / purchaseProjection.housePriceProjected) * 100),
      milestoneGroups: JSON.parse(JSON.stringify(milestoneGroups)),
      currentMilestoneData: currentMilestoneData ? JSON.parse(JSON.stringify(currentMilestoneData)) : null,
      lastMilestoneCalculation: new Date(),
      lastProgressUpdate: new Date(),
    },
    create: {
      planId,
      currentSavings,
      housePriceProjected: purchaseProjection.housePriceProjected,
      savingsPercentage: Math.round((currentSavings / purchaseProjection.housePriceProjected) * 100),
      milestoneGroups: JSON.parse(JSON.stringify(milestoneGroups)),
      currentMilestoneData: currentMilestoneData ? JSON.parse(JSON.stringify(currentMilestoneData)) : null,
      lastMilestoneCalculation: new Date(),
      lastProgressUpdate: new Date(),
    },
  });

  return { success: true };
}
