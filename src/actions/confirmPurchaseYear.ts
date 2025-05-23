"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

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
      select: { // Add explicit select to fetch only necessary fields
        id: true,
      }
    });

    if (!plan) {
      throw new Error("Plan not found");
    }

    // Update the plan with the confirmed purchase year
    await db.plan.update({
      where: {
        id: planId,
      },
      data: {
        confirmedPurchaseYear,
        // Invalidate cached report data as the confirmed year has changed
        reportGeneratedAt: null,
        reportAssetEfficiency: null,
        reportCapitalStructure: null,
        reportSpendingPlan: null,
        reportInsurance: null,
        reportBackupPlans: null,
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
