"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Plan } from "@prisma/client";
import { generateProjections, PlanWithDetails } from "@/lib/calculations/projections/generateProjections";
import { determineAffordabilityOutcome } from "@/lib/calculations/projections/generateComparisonData";
import { PlanFormState } from "@/components/plan/multi-step-form/types";
// import { FormState } from "@/components/plan/plan-form"; // Old form state

/**
 * Server Action: Plan Submission & Calculation (Updated for Multi-Step Form)
 * 
 * This action handles both creation and updates from the new multi-step form.
 * 1. Receives validated plan data from the new form structure.
 * 2. Maps the new form state to the updated Prisma schema.
 * 3. Saves or updates the plan in the database.
 * 4. Executes core projections and updates the plan with results.
 */
export async function submitPlan(formData: PlanFormState & { planId?: string; userId: string }) {
  try {
    const { userId, planId, ...planData } = formData;

    // Validate the user
    const clerkUser = await currentUser();
    if (!clerkUser || clerkUser.id !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Giai đoạn 3: Kiểm tra xem người dùng đã có kế hoạch nào chưa TRƯỚC KHI tạo mới
    if (!planId) {
      const existingPlan = await db.plan.findFirst({
        where: { userId: userId },
      });

      if (existingPlan) {
        // Nếu đã có, không cho tạo mới và trả về lỗi
        return { success: false, error: "User already has a plan." };
      }
    }

    const { familySupport, paymentMethod, ...restOfPlanData } = planData;

    // The payload for the main Plan model should only contain its direct fields.
    const planPayload = {
      ...restOfPlanData,
      paymentMethod: paymentMethod,
    };

    // Explicitly map fields from the form's familySupport object to what the database expects.
    // This prevents trying to save UI-only fields like 'hasFamilySupport'.
    const familySupportPayload = familySupport.hasFamilySupport ? {
      familySupportType: familySupport.familySupportType,
      familySupportAmount: familySupport.familySupportAmount,
      familyGiftTiming: familySupport.familyGiftTiming,
      familyLoanRepaymentType: familySupport.familyLoanRepaymentType,
      familyLoanInterestRate: familySupport.familyLoanInterestRate,
      familyLoanTermYears: familySupport.familyLoanTermYears,
    } : {
      // If user says they have no support, explicitly clear all fields.
      familySupportType: null,
      familySupportAmount: null,
      familyGiftTiming: null,
      familyLoanRepaymentType: null,
      familyLoanInterestRate: null,
      familyLoanTermYears: null,
    };

    let plan: Plan;
    if (planId) {
      // Update existing plan
      plan = await db.plan.update({
        where: { id: planId, userId: userId },
        data: {
          ...planPayload,
          familySupport: {
            upsert: {
              create: familySupportPayload,
              update: familySupportPayload,
            },
          },
          history: {
            upsert: {
              create: { revisionCount: 1 },
              update: { revisionCount: { increment: 1 } },
            },
          },
        },
      });
    } else {
      // Create new plan
      plan = await db.plan.create({
        data: {
          ...planPayload,
          userId: userId,
          userEmail:
            clerkUser.emailAddresses.find(
              (e) => e.id === clerkUser.primaryEmailAddressId
            )?.emailAddress || '',
          familySupport: {
            create: familySupportPayload,
          },
        },
        include: {
          familySupport: true,
        }
      });
    }

    // After submission, we need the full plan with the new relation
    const fullPlan = await db.plan.findUnique({
      where: { id: plan.id },
      include: {
        familySupport: true,
      },
    });

    if (!fullPlan) {
      return { success: false, error: "Failed to retrieve plan after creation." };
    }

    // Re-enable and update projection logic
    const projectionData = generateProjections(fullPlan as Partial<PlanWithDetails>);

    // Determine affordability outcome
    const { affordabilityOutcome, firstViableYear } = determineAffordabilityOutcome(
      projectionData,
      plan.yearsToPurchase
    );
    const targetYearBuffer = projectionData[plan.yearsToPurchase].buffer;

    // Update the plan with the affordability outcome
    await db.plan.update({
      where: { id: plan.id },
      data: {
        affordabilityOutcome,
        firstViableYear,
        buffer: targetYearBuffer,
        // Invalidate report cache since plan inputs have changed
        report: {
          upsert: {
            create: {
              generatedAt: null,
              assetEfficiency: null,
              capitalStructure: null,
              spendingPlan: null,
              insurance: null,
              backupPlans: null,
            },
            update: {
              generatedAt: null,
              assetEfficiency: null,
              capitalStructure: null,
              spendingPlan: null,
              insurance: null,
              backupPlans: null,
            },
          },
        },
      },
    });

    // Return the full result
    return {
      success: true,
      planId: plan.id,
      affordabilityOutcome,
      firstViableYear,
    };
  } catch (error) {
    console.error("[SUBMIT_PLAN_V2]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process plan",
    };
  }
}
