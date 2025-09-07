"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { revalidatePath } from "next/cache";
import { Plan } from "@prisma/client";
import { buildPlanForProjection, computeOnboardingOutcome } from "./projectionHelpers";
import logger from "@/lib/logger";

async function runProjectionWithEngine(planId: string): Promise<{ earliestPurchaseYear: number; message: string; }> {
  const enginePlan = await buildPlanForProjection(planId);
  const outcome = await computeOnboardingOutcome(enginePlan);
  return { earliestPurchaseYear: outcome.earliestPurchaseYear, message: outcome.message };
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

    const result = await runProjectionWithEngine(planId);

    await db.plan.update({
        where: { id: planId },
        data: { firstViableYear: result.earliestPurchaseYear }
    });

    revalidatePath(`/plan/${planId}`);
    return { success: true, ...result };

  } catch (error) {
    logger.error("[ACTION_ERROR] Failed to update and recalculate (FamilySupport)", { error: String(error) });
    return { success: false, error: "Đã có lỗi xảy ra phía máy chủ." };
  }
}
