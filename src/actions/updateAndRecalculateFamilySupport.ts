"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { revalidatePath } from "next/cache";

// This is a placeholder for your actual projection logic.
// You should replace this with a call to your real calculation engine.
async function runProjection(plan: any, supportData: any): Promise<any> {
  const previousYear = plan.firstViableYear;
  // Simplified logic: every 100M of support reduces the year by 1.
  const supportAmount = (supportData.familySupportGiftAmount || 0) + (supportData.familySupportLoanAmount || 0);
  const yearReduction = Math.floor(supportAmount / 100_000_000);
  const newYear = previousYear - yearReduction;

  let message = "";
  if (newYear < previousYear) {
    message = `Sự hỗ trợ của gia đình và người thân đã rút ngắn hành trình đáng kể 🥳 Bạn sẽ mua được nhà sớm nhất vào năm ${newYear}.`;
  } else {
    message = `Không sao, bàn tay ta làm nên tất cả, có sức người, sỏi đá cũng xếp được thành căn nhà đầu tiên 💪. Bạn vẫn sẽ mua được nhà sớm nhất vào năm ${newYear}.`;
  }

  return { earliestPurchaseYear: newYear, message };
}

export async function updateAndRecalculateFamilySupport(
  planId: string,
  formData: Partial<OnboardingPlanState>
) {
  try { // Start of the main try block
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const plan = await db.plan.findUnique({ where: { id: planId, userId: user.id } });
    if (!plan) return { success: false, error: "Plan not found." };

    await db.familySupport.upsert({
      where: { planId },
      // @ts-ignore
      update: formData,
      // @ts-ignore
      create: { planId, ...formData },
    });

    // Recalculate based on the new data
    const result = await runProjection(plan, formData);

    // Optionally, save the new projection year to the plan
    await db.plan.update({
        where: { id: planId },
        data: { firstViableYear: result.earliestPurchaseYear }
    });

    revalidatePath(`/plan/${planId}`);
    // IMPORTANT: Ensure success is explicitly set to true
    return { success: true, ...result };

  } catch (error) {
    // Log the actual error on the server for debugging
    console.error("[ACTION_ERROR] Failed to update and recalculate:", error);
    // Return a structured error object to the client
    return { success: false, error: "Đã có lỗi xảy ra phía máy chủ." };
  }
}
