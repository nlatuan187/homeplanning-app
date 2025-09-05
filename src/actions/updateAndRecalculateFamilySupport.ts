"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { revalidatePath } from "next/cache";
import { Plan } from "@prisma/client";

async function runProjection(plan: Plan, supportData: any): Promise<any> {
  const previousYear = plan.firstViableYear;

  // Simplified logic, assuming gift and loan amounts are passed directly
  const supportAmount = (supportData.familySupportGiftAmount || 0) + (supportData.familySupportLoanAmount || 0);
  const yearReduction = Math.floor(supportAmount / 100_000_000); // 1 year per 100M
  const newYear = previousYear ? previousYear - yearReduction : new Date().getFullYear() + 10; // Fallback

  let message = "";
  if (previousYear && newYear < previousYear) {
    message = `Sự hỗ trợ của gia đình và người thân đã rút ngắn hành trình đáng kể 🥳`;
  } else {
    message = `Không sao, bàn tay ta làm nên tất cả, có sức người, sỏi đá cũng xếp được thành căn nhà đầu tiên 💪.`;
  }

  return { earliestPurchaseYear: newYear, message };
}

export async function updateAndRecalculateFamilySupport(
  planId: string,
  formData: any
) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const plan = await db.plan.findUnique({ where: { id: planId, userId: user.id } });
    if (!plan) return { success: false, error: "Plan not found." };
    
    // 1. Separate data for Plan and FamilySupport models
    const planDataToUpdate = {
        hasCoApplicant: formData.hasFinancialPartner,
        coApplicantMonthlyIncome: formData.partnerMonthlyIncome,
        monthlyOtherIncome: formData.otherMonthlyIncome
    };

    const familySupportData = {
        hasFamilySupport: formData.hasFamilySupport,
        familySupportType: formData.familySupportType,
        familySupportAmount: formData.familySupportType === 'GIFT' ? formData.familySupportGiftAmount : formData.familySupportLoanAmount,
        familyGiftTiming: formData.familySupportGiftTiming,
        familyLoanInterestRate: formData.familySupportLoanInterest,
        familyLoanRepaymentType: formData.familySupportLoanRepayment,
        familyLoanTermYears: formData.familySupportLoanTerm,
    };
    
    // 2. Use a transaction to update both tables
    await db.$transaction([
        db.plan.update({
            where: { id: planId },
            data: planDataToUpdate,
        }),
        db.familySupport.upsert({
            where: { planId },
            update: familySupportData,
            create: { planId, ...familySupportData },
        })
    ]);

    const result = await runProjection(plan, formData);

    await db.plan.update({
        where: { id: planId },
        data: { firstViableYear: result.earliestPurchaseYear }
    });

    revalidatePath(`/plan/${planId}`);
    return { success: true, ...result };

  } catch (error) {
    console.error("[ACTION_ERROR] Failed to update and recalculate:", error);
    return { success: false, error: "Đã có lỗi xảy ra phía máy chủ." };
  }
}
