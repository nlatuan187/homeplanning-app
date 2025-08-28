'use server';

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateProjections, PlanWithDetails } from "@/lib/calculations/projections/generateProjections";
import { getMilestonesByGroup } from "@/lib/isMilestoneUnlocked";

// Schema để validate assumptions vẫn giữ nguyên
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
  // Bọc toàn bộ logic trong một khối try...catch duy nhất
  try {
    // 1. Xác thực người dùng
    const user = await currentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // 2. Lấy dữ liệu plan hiện tại để xác thực và tính toán
    const existingPlan = await db.plan.findUnique({
      where: { id: planId, userId: user.id },
      include: { familySupport: true },
    });

    if (!existingPlan) {
      throw new Error("Plan not found or user does not have access.");
    }

    // 3. Validate assumptions đầu vào
    const parsed = assumptionSchema.safeParse(newAssumptions);
    if (!parsed.success) {
      console.error("Validation error:", parsed.error);
      throw new Error("Invalid assumption data provided.");
    }

    // --- BẮT ĐẦU CÁC BƯỚC TÍNH TOÁN TRONG BỘ NHỚ ---

    // 4. Tạo một object "plan" ảo với các giả định đã được cập nhật
    const planWithNewAssumptions: PlanWithDetails = {
      ...existingPlan,
      ...parsed.data, // Ghi đè các giả định mới
      paymentMethod: existingPlan.paymentMethod as "fixed" | "decreasing",
    };

    // 5. Chạy lại các phép tính toán chính dựa trên dữ liệu ảo
    const projections = generateProjections(planWithNewAssumptions);
    const purchaseProjection = projections.find(p => p.year === planWithNewAssumptions.confirmedPurchaseYear) || projections[0];
    const currentSavings = planWithNewAssumptions.initialSavings || 0;

    const milestoneGroups = getMilestonesByGroup(
      planWithNewAssumptions.createdAt.getFullYear() + (planWithNewAssumptions.createdAt.getMonth() + 1) / 12,
      planWithNewAssumptions.confirmedPurchaseYear ?? new Date().getFullYear() + planWithNewAssumptions.yearsToPurchase,
      purchaseProjection.housePriceProjected,
      currentSavings,
      planWithNewAssumptions
    );
    
    // Tìm milestone hiện tại từ kết quả tính toán
    let currentMilestoneData = null;
    for (const group of milestoneGroups) {
      const currentMilestone = group.milestones.find(m => m.status === "current");
      if (currentMilestone) {
        currentMilestoneData = { /* ... cấu trúc dữ liệu milestone ... */ };
        break;
      }
    }

    // --- KẾT THÚC TÍNH TOÁN, CHUẨN BỊ GHI XUỐNG DATABASE ---

    // 6. Thực hiện MỘT LỆNH UPDATE DUY NHẤT với "ghi lồng nhau"
    await db.plan.update({
      where: { id: planId },
      data: {
        // Cập nhật các trường giả định trên Plan
        ...parsed.data,

        // Cập nhật các bảng liên quan
        report: {
          upsert: { // Dùng upsert để an toàn
            create: { generatedAt: null },
            update: { generatedAt: null },
          },
        },
        milestoneProgress: {
          upsert: {
            create: {
              currentSavings,
              housePriceProjected: purchaseProjection.housePriceProjected,
              savingsPercentage: Math.round((currentSavings / purchaseProjection.housePriceProjected) * 100),
              lastMilestoneCalculation: new Date(),
              userEmail: user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || "",
            },
            update: {
              currentSavings,
              housePriceProjected: purchaseProjection.housePriceProjected,
              savingsPercentage: Math.round((currentSavings / purchaseProjection.housePriceProjected) * 100),
              lastMilestoneCalculation: new Date(),
            },
          },
        },
        roadmap: {
          upsert: {
            create: {
              milestoneGroups: JSON.parse(JSON.stringify(milestoneGroups)),
              currentMilestoneData: currentMilestoneData ? JSON.parse(JSON.stringify(currentMilestoneData)) : null,
            },
            update: {
              milestoneGroups: JSON.parse(JSON.stringify(milestoneGroups)),
              currentMilestoneData: currentMilestoneData ? JSON.parse(JSON.stringify(currentMilestoneData)) : null,
            },
          },
        },
      },
    });

    // 7. Trả về thành công
    return { success: true };

  } catch (error) {
    console.error("[CONFIRM_PLAYGROUND_ASSUMPTIONS_ERROR]", error);
    // Trả về một object lỗi nhất quán
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred."
    };
  }
}
