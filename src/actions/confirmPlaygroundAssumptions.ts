'use server';

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { getMilestonesByGroup } from "@/lib/isMilestoneUnlocked";

// Schema để validate assumptions - cho phép update từng phần
const assumptionSchema = z.object({
  yearsToPurchase: z.number().optional(),
  targetHousePriceN0: z.number().optional(),
  targetHouseType: z.string().optional(),
  targetLocation: z.string().optional(),
  pctHouseGrowth: z.number().optional(),
  userMonthlyIncome: z.number().optional(),
  hasCoApplicant: z.boolean().optional(),
  coApplicantMonthlyIncome: z.number().optional(),
  monthlyOtherIncome: z.number().optional(),
  pctSalaryGrowth: z.number().optional(),
  coApplicantSalaryGrowth: z.number().optional(),
  monthlyLivingExpenses: z.number().optional(),
  monthlyNonHousingDebt: z.number().optional(),
  currentAnnualInsurancePremium: z.number().optional(),
  initialSavings: z.number().optional(),
  pctExpenseGrowth: z.number().optional(),
  pctInvestmentReturn: z.number().optional(),
});

export async function confirmPlaygroundAssumptions(
  planId: string,
  newAssumptions: z.infer<typeof assumptionSchema>
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
    console.error("Validation error:", parsed.error);
    throw new Error("Invalid assumptions");
  }

  // 4. Cập nhật plan với assumptions mới - chỉ update những field được cung cấp
  const updateData: any = {};
  
  // Chỉ thêm vào updateData những field có giá trị
  Object.entries(parsed.data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      updateData[key] = value;
    }
  });

  const updatedPlan = await db.plan.update({
    where: { id: planId },
    data: {
      ...updateData,
      reportGeneratedAt: null,
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
        title: group.title,
        status: currentMilestone.status,
        amountValue: currentMilestone.amountValue,
        items: currentMilestone.items,
      };
      break;
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
