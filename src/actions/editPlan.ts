"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

/**
 * Server Action: Edit an existing plan
 * 
 * This action:
 * 1. Verifies the user owns the plan
 * 2. Stores the current plan data in revisionHistory
 * 3. Increments revisionCount
 * 4. Redirects to the plan form with the plan data pre-populated
 * 5. Optionally starts at a specific section
 */
export async function editPlan(planId: string, redirectPath?: string, startSection?: string) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get the plan
    const plan = await db.plan.findUnique({
      where: {
        id: planId,
      },
    });

    if (!plan) {
      throw new Error("Plan not found");
    }

    // Verify the user owns the plan
    if (plan.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Create a copy of the current plan data for revision history
    const currentPlanData = { ...plan };
    
    // Get only revisionHistory and revisionCount for updating
    const existingHistoryData = await db.planHistory.findUnique({
      where: { id: planId },
      select: { revisionHistory: true, revisionCount: true }
    });
    
    // Don't include revisionHistory in the history snapshot itself
    delete (currentPlanData as Record<string, unknown>).revisionHistory;
    delete (currentPlanData as Record<string, unknown>).revisionCount;


    let newRevisionHistory: Array<{ timestamp: string; data: unknown }> = [];
    if (existingHistoryData?.revisionHistory && Array.isArray(existingHistoryData.revisionHistory)) {
      // Ensure it's an array before treating it as such
      newRevisionHistory = existingHistoryData.revisionHistory as Array<{ timestamp: string; data: unknown }>;
    }

    // Add the current plan data to the revision history
    newRevisionHistory.push({
      timestamp: new Date().toISOString(),
      data: currentPlanData, // This is the plan state *before* this edit
    });

    // Update the plan with the new revision history and increment the revision count
    await db.plan.update({
      where: {
        id: planId,
      },
      data: {
        // Also clear confirmed purchase year and affordability results as they might become stale
        confirmedPurchaseYear: null,
        affordabilityOutcome: null,
        firstViableYear: null,
        buffer: null,
      } as Prisma.PlanUpdateInput,
    });

    await db.planHistory.update({
      where: { planId: planId },
      data: {
        revisionCount: (existingHistoryData?.revisionCount || 0) + 1,
        revisionHistory: newRevisionHistory as unknown as Prisma.InputJsonValue, // Cast to Prisma.InputJsonValue
      }
    });

    await db.planReport.update({
      where: { planId: planId },
      data: {
        generatedAt: null,
        assetEfficiency: null,
        capitalStructure: null,
        spendingPlan: null,
        insurance: null,
        backupPlans: null,
        projectionCache: null,
      }
    });

    // Redirect to the specified path or default to the plan form
    if (redirectPath) {
      redirect(redirectPath);
    } else {
      // Default: Redirect to the plan form with the plan ID
      // The form will load the plan data and pre-populate the form
      const sectionParam = startSection ? `&section=${startSection}` : '';
      redirect(`/plan/new?edit=${planId}${sectionParam}`);
    }
  } catch (error) {
    console.error("[EDIT_PLAN]", error);
    throw error;
  }
}
