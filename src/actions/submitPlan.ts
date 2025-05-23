"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { determineAffordabilityOutcome } from "@/lib/calculations/projections/generateComparisonData";
import { FormState } from "@/components/plan/plan-form";

/**
 * Server Action 1: Initial Plan Submission & Basic Calculation
 * 
 * This action:
 * 1. Receives validated plan data and userId
 * 2. Saves the plan to the database
 * 3. Executes core projections
 * 4. Determines affordability outcome using corrected logic
 * 5. Updates the plan with results
 * 6. Returns minimal result to frontend
 */
export async function submitPlan(formData: FormState & { planId?: string }) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Create a new plan in the database with type assertion to bypass TypeScript errors
    // The schema has been updated with the new fields, but TypeScript types haven't been regenerated correctly
    const planData = {
      userId,
      planName: "Kế hoạch mua nhà",
      userEmail: user?.emailAddresses[0]?.emailAddress,
      yearsToPurchase: Number(formData.yearsToPurchase),
      targetHousePriceN0: Number(formData.targetHousePriceN0),
      targetHouseType: formData.targetHouseType,
      targetLocation: formData.targetLocation,
      maritalStatus: formData.maritalStatus,
      hasDependents: Boolean(formData.hasDependents),
      numberOfDependents: Number(formData.numberOfDependents || 0),
      plansMarriageBeforeTarget: Boolean(formData.plansMarriageBeforeTarget || false),
      targetMarriageYear: formData.targetMarriageYear ? Number(formData.targetMarriageYear) : null,
      plansChildBeforeTarget: Boolean(formData.plansChildBeforeTarget || false),
      targetChildYear: formData.targetChildYear ? Number(formData.targetChildYear) : null,
      initialSavingsGoal: Number(formData.initialSavingsGoal),
      incomeLastYear: Number(formData.incomeLastYear),
      monthlyOtherIncome: Number(formData.monthlyOtherIncome),
      monthlyLivingExpenses: Number(formData.monthlyLivingExpenses),
      monthlyNonHousingDebt: Number(formData.monthlyNonHousingDebt),
      currentAnnualInsurancePremium: Number(formData.currentAnnualInsurancePremium),
      spouseMonthlyIncome: Number(formData.spouseMonthlyIncome || 0),
      // Các trường có thể để trống - chuyển thành 0 nếu undefined
      pctHouseGrowth: formData.pctHouseGrowth !== undefined ? Number(formData.pctHouseGrowth) : 0,
      pctSalaryGrowth: formData.pctSalaryGrowth !== undefined ? Number(formData.pctSalaryGrowth) : 0,
      pctExpenseGrowth: formData.pctExpenseGrowth !== undefined ? Number(formData.pctExpenseGrowth) : 0,
      pctInvestmentReturn: formData.pctInvestmentReturn !== undefined ? Number(formData.pctInvestmentReturn) : 0,
      factorMarriage: formData.factorMarriage !== undefined ? Number(formData.factorMarriage) : 0,
      factorChild: formData.factorChild !== undefined ? Number(formData.factorChild) : 0,
      
      // Các trường bắt buộc - đã được validation đảm bảo > 0
      loanInterestRate: Number(formData.loanInterestRate),
      loanTermMonths: Number(formData.loanTermMonths),
    };

    // Check if we're updating an existing plan or creating a new one
    let plan;
    if (formData.planId) {
      // Update existing plan
      plan = await db.plan.update({
        where: {
          id: formData.planId,
        },
        data: planData as unknown as Prisma.PlanUpdateInput,
      });
    } else {
      // Create new plan
      plan = await db.plan.create({
        data: planData as unknown as Prisma.PlanCreateInput,
      });
    }

    // Generate projections
    const projectionData = generateProjections(plan);

    // Determine affordability outcome using corrected logic
    const { affordabilityOutcome, firstViableYear } = determineAffordabilityOutcome(
      projectionData,
      plan.yearsToPurchase
    );

    // Get the buffer for the target year
    const targetYearBuffer = projectionData[plan.yearsToPurchase].buffer;

    // Update the plan with the affordability outcome, first viable year, and buffer
    // Using type assertion for the update data to handle the new fields
    const updateData = {
      affordabilityOutcome,
      firstViableYear,
      buffer: targetYearBuffer,
    };

    // Update the plan with the affordability outcome, first viable year, and buffer
    // Also, invalidate report cache since plan inputs have changed
    await db.plan.update({
      where: {
        id: plan.id,
      },
      data: {
        ...updateData,
        // Invalidate report cache
        reportGeneratedAt: null,
        reportAssetEfficiency: null,
        reportCapitalStructure: null,
        reportSpendingPlan: null,
        reportInsurance: null,
        reportBackupPlans: null,
        // confirmedPurchaseYear might also need to be reset if plan inputs change significantly
        // For now, only clearing report cache. Affordability outcome might lead to new confirmed year flow.
      } as Prisma.PlanUpdateInput, 
    });

    // Return minimal result
    return {
      success: true,
      planId: plan.id,
      affordabilityOutcome,
      firstViableYear,
    };
  } catch (error) {
    console.error("[SUBMIT_PLAN]", error);
    return {
      success: false,
      error: "Failed to create plan",
    };
  }
}
