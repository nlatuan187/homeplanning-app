"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { runProjectionWithEngine } from "./projectionHelpers";
import { PlanWithDetails } from "@/lib/calculations/projections/generateProjections";
import { redirect } from "next/navigation";
import { Plan } from "@prisma/client";

/**
 * Helper function to get the current user and plan, ensuring ownership.
 */
async function getUserAndPlan(planId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const plan = await db.plan.findUnique({
    where: { id: planId, userId: user.id },
  });

  if (!plan) {
    throw new Error("Plan not found or user does not have access.");
  }

  return { user, plan };
}

/**
 * SECTION 1: Cập nhật dữ liệu từ QuickCheck
 */
export async function updateQuickCheckSection(planId: string, data: Partial<OnboardingPlanState>) {
  try {
    await getUserAndPlan(planId);

    await db.plan.update({
      where: { id: planId },
      data: {
        targetHousePriceN0: data.targetHousePriceN0 ? data.targetHousePriceN0 * 1000 : 0,
        initialSavings: data.initialSavings,
        userMonthlyIncome: data.userMonthlyIncome,
        monthlyLivingExpenses: data.monthlyLivingExpenses,
        yearsToPurchase: data.yearsToPurchase ? data.yearsToPurchase - new Date().getFullYear() : undefined,
      },
    });

    revalidatePath(`/plan/${planId}/edit`);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * SECTION 2: Cập nhật dữ liệu từ FamilySupport
 */
export async function updateFamilySupportSection(planId: string, data: Partial<OnboardingPlanState>) {
  try {
    await getUserAndPlan(planId);

    const familySupportData = {
      coApplicantMonthlyIncome: data.coApplicantMonthlyIncome,
      monthlyOtherIncome: data.monthlyOtherIncome,
      hasFamilySupport: data.hasFamilySupport,
      familySupportType: data.familySupportType,
      familySupportAmount: data.familySupportLoanAmount || data.familySupportGiftAmount,
      familyGiftTiming: data.familySupportGiftTiming,
      familyLoanRepaymentType: data.familySupportLoanRepayment,
      familyLoanInterestRate: data.familySupportLoanInterest,
      familyLoanTermYears: data.familySupportLoanTerm,
    };

    await db.planFamilySupport.upsert({
      where: { planId },
      update: familySupportData,
      create: {
        planId,
        ...familySupportData,
      },
    });

    revalidatePath(`/plan/${planId}/edit`);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * SECTION 3: Cập nhật dữ liệu từ Spending
 */
export async function updateSpendingSection(planId: string, data: Partial<OnboardingPlanState>) {
  try {
    await getUserAndPlan(planId);

    await db.plan.update({
      where: { id: planId },
      data: {
        monthlyNonHousingDebt: data.monthlyNonHousingDebt,
        currentAnnualInsurancePremium: data.currentAnnualInsurancePremium,
        hasNewChild: data.hasNewChild,
        yearToHaveChild: data.yearToHaveChild,
        monthlyChildExpenses: data.monthlyChildExpenses,
      },
    });

    revalidatePath(`/plan/${planId}/edit`);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * SECTION 4: Cập nhật dữ liệu từ Assumption VÀ TÍNH TOÁN LẠI
 * Hàm này sẽ được gọi ở bước cuối cùng để vừa lưu, vừa tính toán và trả về kết quả.
 */
export async function updateAssumptionSectionAndRecalculate(planId: string, data: Partial<OnboardingPlanState>) {
  try {
    const { plan } = await getUserAndPlan(planId);

    // 1. Cập nhật các giả định mới
    const updatedPlan = await db.plan.update({
      where: { id: planId },
      data: {
        pctSalaryGrowth: data.salaryGrowthRate,
        pctHouseGrowth: data.propertyGrowthRate,
        pctInvestmentReturn: data.investmentReturnRate,
      },
      include: { familySupport: true },
    });

    // 2. Chạy lại engine tính toán với dữ liệu đã được cập nhật
    const calculationResult = await runProjectionWithEngine(planId);

    // 3. Cập nhật cache và năm khả thi
    await db.planReport.upsert({
      where: { planId },
      update: { projectionCache: calculationResult as any },
      create: { planId, projectionCache: calculationResult as any },
    });
    await db.plan.update({
      where: { id: planId },
      data: { firstViableYear: calculationResult.earliestPurchaseYear }
    });

    revalidatePath(`/plan/${planId}`);
    revalidatePath('/dashboard');

    return {
      success: true,
      plan: updatedPlan,
      earliestPurchaseYear: calculationResult.earliestPurchaseYear,
      message: calculationResult.message,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Cập nhật một trường dữ liệu duy nhất trong Plan.
 * Rất hiệu quả cho các thay đổi nhỏ, tức thời như slider.
 */
export async function updateSinglePlanField(
  planId: string,
  fieldName: keyof Plan, // Chỉ cho phép các key hợp lệ của model Plan
  value: number | string | boolean | Date | null
) {
  try {
    // Không cần getUserAndPlan đầy đủ vì revalidatePath không cần user
    const user = await currentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Đảm bảo chỉ chủ sở hữu mới có thể sửa
    const plan = await db.plan.findFirst({
      where: { id: planId, userId: user.id }
    });
    if (!plan) {
      return { success: false, error: "Plan not found." };
    }

    await db.plan.update({
      where: { id: planId },
      data: {
        [fieldName]: value,
      },
    });

    // Revalidate lại trang edit để đảm bảo dữ liệu luôn mới
    revalidatePath(`/plan/${planId}/edit`);
    return { success: true };

  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Chỉ chạy lại engine tính toán cho một plan đã có, dựa trên dữ liệu mới nhất trong DB.
 * Rất hữu ích sau khi đã cập nhật các trường riêng lẻ bằng debounce.
 */
export async function runProjectionForPlan(planId: string) {
  try {
    // Xác thực người dùng và quyền sở hữu plan
    const { plan } = await getUserAndPlan(planId);

    // Chạy lại engine tính toán
    const calculationResult = await runProjectionWithEngine(plan.id);

    // Cập nhật lại cache và năm khả thi sớm nhất để đồng bộ dữ liệu
    await db.planReport.upsert({
      where: { planId: plan.id },
      update: { projectionCache: calculationResult as any },
      create: { planId: plan.id, projectionCache: calculationResult as any },
    });

    await db.plan.update({
      where: { id: plan.id },
      data: { firstViableYear: calculationResult.earliestPurchaseYear }
    });

    // Lấy lại plan đã cập nhật đầy đủ để trả về cho client
    const updatedPlan = await db.plan.findUnique({
      where: { id: plan.id },
      include: { familySupport: true }
    });

    revalidatePath(`/plan/${plan.id}`);
    revalidatePath('/dashboard');

    return {
      success: true,
      plan: updatedPlan,
      earliestPurchaseYear: calculationResult.earliestPurchaseYear,
      message: calculationResult.message,
    };

  } catch (error) {
    console.error(`[ACTION_ERROR] Failed to run projection for plan ${planId}:`, error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Xóa tiến trình onboarding của một kế hoạch.
 * Được gọi sau khi người dùng hoàn thành luồng chỉnh sửa kế hoạch.
 */
export async function deleteOnboardingProgress(planId: string) {
  try {
    // Xác thực người dùng và quyền sở hữu plan
    await getUserAndPlan(planId);

    // Tìm và xóa bản ghi OnboardingProgress
    await db.onboardingProgress.delete({
      where: { planId: planId },
    });

    return { success: true };
  } catch (error) {
    // Lỗi có thể xảy ra nếu không tìm thấy bản ghi, nhưng ta có thể bỏ qua
    // vì mục tiêu cuối cùng là không còn bản ghi đó nữa.
    if ((error as any).code === 'P2025') { // Mã lỗi của Prisma khi không tìm thấy record
      return { success: true, message: "Onboarding progress not found, considered deleted." };
    }
    console.error(`[ACTION_ERROR] Failed to delete onboarding progress for plan ${planId}:`, error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Redirects to the edit page for a plan.
 * Restored to fix missing export issue.
 */
export async function editPlan(planId: string, _?: any, section?: string) {
  redirect(`/plan/${planId}/edit`);
}

