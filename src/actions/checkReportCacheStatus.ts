"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

interface CacheStatus {
  isCacheValid: boolean;
  reason: string;
}

/**
 * Checks if the report for a given plan is cached and still valid.
 * @param planId The ID of the plan to check.
 * @returns An object indicating if the cache is valid and the reason why.
 */
export async function checkReportCacheStatus(
  planId: string
): Promise<CacheStatus> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  try {
    // 1. Fetch the plan AND its related report in a single query
    const plan = await db.plan.findUnique({
      where: {
        id: planId,
        userId: userId,
      },
      include: {
        report: true, // Include the related PlanReport record
      },
    });

    if (!plan) {
      throw new Error("Plan not found");
    }

    // 2. Check the report status from the included relation
    const report = plan.report;

    if (!report || !report.generatedAt) {
      return {
        isCacheValid: false,
        reason: "Report has not been generated yet.",
      };
    }

    // 3. IMPORTANT: Check if the plan was updated *after* the report was generated.
    // If so, the cached report is stale and needs to be regenerated.
    if (plan.updatedAt > report.generatedAt) {
      return {
        isCacheValid: false,
        reason: "Plan has been updated since the last report was generated.",
      };
    }

    // If all checks pass, the cache is valid
    return {
      isCacheValid: true,
      reason: "Valid report found in cache.",
    };
  } catch (error) {
    console.error("Error checking report cache status:", error);
    // Return false in case of any error to be safe
    return {
      isCacheValid: false,
      reason: "An error occurred while checking the cache.",
    };
  }
}
