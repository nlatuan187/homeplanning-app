"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateProjections, PlanWithDetails } from "@/lib/calculations/projections/generateProjections";
import { getProjectionsWithCache } from "@/actions/milestoneProgress";
import { ProjectionRow } from "@/lib/calculations/affordability";

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

    await db.onboardingProgress.delete({
      where: {
        planId: planId,
      },
    });

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
    const projectionData = generateProjections(plan as PlanWithDetails);

    // Update the plan with the confirmed purchase year
    await db.plan.update({
      where: {
        id: planId,
      },
      data: {
        affordabilityOutcome: "ScenarioB",
        confirmedPurchaseYear: confirmedPurchaseYear + new Date().getFullYear(),
        // Use upsert to handle cases where the report doesn't exist yet.
        // This will create a new PlanReport if one isn't found, or update
        // the existing one.
        report: {
          upsert: {
            create: {
              // Define the initial state of the report if it's being created
              generatedAt: null,
              projectionCache: projectionData as any,
            },
            update: {
              // If the report already exists, reset its fields to invalidate cache
              generatedAt: null,
              assetEfficiency: null,
              capitalStructure: null,
              spendingPlan: null,
              insurance: null,
              backupPlans: null,
              projectionCache: projectionData as any,
            },
          },
        },
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
