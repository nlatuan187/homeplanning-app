"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";

/**
 * Server Action 3: Save Confirmed Year
 * 
 * This action:
 * 1. Receives planId and confirmedPurchaseYear
 * 2. Verifies ownership
 * 3. Updates the plan with the confirmed year
 * 4. Returns success confirmation
 */
export async function confirmPurchaseYear(planId: string, confirmedPurchaseYear: number) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Verify plan ownership
    const plan = await db.plan.findUnique({
      where: {
        id: planId,
        userId,
      },
      include: {
        familySupport: true, // Get the full plan with necessary relations
      },
    });

    if (!plan) {
      throw new Error("Plan not found");
    }

    // Update the local plan object with the confirmed year before generating projections
    plan.confirmedPurchaseYear = confirmedPurchaseYear;

    // Update the plan with the confirmed purchase year
    await db.plan.update({
      where: {
        id: planId,
      },
      data: {
        confirmedPurchaseYear,
        // Invalidate cached report data using a nested write
        report: {
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
    });

    // Re-run projections with the confirmed year locked in
    const projectionData = generateProjections(plan);

    // Save the projections to the cache in PlanReport
    await db.planReport.update({
      where: {
        planId: planId,
      },
      data: {
        projectionCache: projectionData as any, // Lưu cache
      },
    });

    // Return success
    return {
      success: true,
      planId,
      confirmedPurchaseYear,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during purchase year confirmation.";
    console.error("[CONFIRM_PURCHASE_YEAR] Detailed Error:", error); // Server log
    return {
      success: false,
      error: `Failed to confirm purchase year: ${errorMessage}`, // To client
    };
  }
}
