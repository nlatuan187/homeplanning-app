import { db } from "@/lib/db";
import { z } from "zod";
import { PlanFamilySupport, FamilySupportType, FamilyGiftTiming, FamilyLoanRepaymentType, Plan } from "@prisma/client";
import logger from "@/lib/logger";

// --- Section: Family Support ---
export const updateFamilySupportSchema = z.object({
    coApplicantMonthlyIncome: z.number().nonnegative().nullable().optional(),
    monthlyOtherIncome: z.number().nonnegative().optional(), // FIX: Removed .nullable() to match Prisma schema
    hasFamilySupport: z.boolean().nullable().optional(),
    familySupportType: z.nativeEnum(FamilySupportType).nullable().optional(),
    familySupportAmount: z.number().nonnegative().nullable().optional(),
    familyGiftTiming: z.nativeEnum(FamilyGiftTiming).nullable().optional(),
    familyLoanRepaymentType: z.nativeEnum(FamilyLoanRepaymentType).nullable().optional(),
    familyLoanInterestRate: z.number().nonnegative().nullable().optional(),
    familyLoanTermYears: z.number().int().nullable().optional(),
});
export type UpdateFamilySupportData = z.infer<typeof updateFamilySupportSchema>;

export async function updateFamilySupport(planId: string, userId: string, data: UpdateFamilySupportData): Promise<PlanFamilySupport> {
    const plan = await db.plan.findUnique({ where: { id: planId, userId } });
    if (!plan) throw new Error("Plan not found or permission denied.");

    return await db.planFamilySupport.upsert({
        where: { planId },
        update: data,
        create: { planId, ...data },
    });
}

// --- Section: Spending (merged with Family Support) ---
export const updateSpendingSchema = z.object({
    // Spending fields
    monthlyNonHousingDebt: z.number().nonnegative().optional(),
    currentAnnualInsurancePremium: z.number().nonnegative().optional(),
    hasNewChild: z.boolean().optional(),
    yearToHaveChild: z.number().int().optional(),
    monthlyChildExpenses: z.number().nonnegative().optional(),

    // Family Support fields (merged from updateFamilySupportSchema)
    coApplicantMonthlyIncome: z.number().nonnegative().nullable().optional(),
    monthlyOtherIncome: z.number().nonnegative().optional(),
    hasFamilySupport: z.boolean().nullable().optional(),
    familySupportType: z.nativeEnum(FamilySupportType).nullable().optional(),
    familySupportAmount: z.number().nonnegative().nullable().optional(),
    familyGiftTiming: z.nativeEnum(FamilyGiftTiming).nullable().optional(),
    familyLoanRepaymentType: z.nativeEnum(FamilyLoanRepaymentType).nullable().optional(),
    familyLoanInterestRate: z.number().nonnegative().nullable().optional(),
    familyLoanTermYears: z.number().int().nullable().optional(),
});
export type UpdateSpendingData = z.infer<typeof updateSpendingSchema>;

export async function updateSpending(planId: string, userId: string, data: UpdateSpendingData): Promise<Plan> {
    return await db.$transaction(async (tx) => {
        // 1. Verify plan ownership
        const plan = await tx.plan.findUnique({ where: { id: planId, userId } });
        if (!plan) throw new Error("Plan not found or permission denied.");

        // 2. Separate data into spending and family support fields
        const {
            // Family Support fields
            coApplicantMonthlyIncome,
            monthlyOtherIncome,
            hasFamilySupport,
            familySupportType,
            familySupportAmount,
            familyGiftTiming,
            familyLoanRepaymentType,
            familyLoanInterestRate,
            familyLoanTermYears,
            // Spending fields (rest)
            ...spendingData
        } = data;

        // 3. Update Plan table (spending fields)
        const updatedPlan = await tx.plan.update({
            where: { id: planId },
            data: spendingData,
        });

        // 4. Update PlanFamilySupport table (if any family support data provided)
        const familySupportData = {
            coApplicantMonthlyIncome,
            monthlyOtherIncome,
            hasFamilySupport,
            familySupportType,
            familySupportAmount,
            familyGiftTiming,
            familyLoanRepaymentType,
            familyLoanInterestRate,
            familyLoanTermYears,
        };

        // Only update if at least one field is provided
        if (Object.values(familySupportData).some(v => v !== undefined)) {
            await tx.planFamilySupport.upsert({
                where: { planId },
                update: familySupportData,
                create: { planId, ...familySupportData },
            });
        }

        return updatedPlan;
    });
}

// --- Section: Assumptions ---
export const updateAssumptionsSchema = z.object({
    pctSalaryGrowth: z.number().optional(),
    pctHouseGrowth: z.number().optional(),
    pctInvestmentReturn: z.number().optional(),
    loanInterestRate: z.number().optional(),
    loanTermYears: z.number().int().optional(),
});
export type UpdateAssumptionsData = z.infer<typeof updateAssumptionsSchema>;

export async function updateAssumptions(planId: string, userId: string, data: UpdateAssumptionsData): Promise<Plan> {
    // Wrap operations in a transaction
    return await db.$transaction(async (tx) => {
        // 1. Verify plan ownership
        const plan = await tx.plan.findUnique({ where: { id: planId, userId } });
        if (!plan) throw new Error("Plan not found or permission denied.");

        // 2. Update the assumptions on the plan
        const updatedPlan = await tx.plan.update({
            where: { id: planId },
            data,
        });

        // 3. (Removed) Do not delete onboarding progress here. It will be updated to COMPLETED in the API.

        return updatedPlan;
    });
}

/**
 * Helper chung: Vô hiệu hóa cache của report sau khi update.
 * Bất kỳ section nào thay đổi dữ liệu đầu vào đều nên gọi hàm này.
 */
export async function invalidateReportCache(planId: string) {
    try {
        await db.planReport.updateMany({
            where: { planId },
            data: { generatedAt: null }
        });
        logger.info("Invalidated report cache for plan", { planId });
    } catch (error) {
        // Lỗi không nghiêm trọng, chỉ log lại
        logger.warn("Could not invalidate report cache for plan", { planId, error: String(error) });
    }
}
