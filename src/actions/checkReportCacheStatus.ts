"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // Consistent with generateFinalReport

interface ReportCacheStatus {
  cacheIsValid: boolean;
  confirmedPurchaseYear: number | null;
  planExists: boolean;
}

export async function checkReportCacheStatus(planId: string): Promise<ReportCacheStatus> {
  try {
    const { userId } = await auth();
    if (!userId) {
      // If no user, can't determine status for a specific plan
      return { cacheIsValid: false, confirmedPurchaseYear: null, planExists: false };
    }

    const plan = await db.plan.findUnique({
      where: { id: planId, userId },
      select: {
        reportGeneratedAt: true,
        confirmedPurchaseYear: true,
        // Select all 5 report cache fields to check their existence
        reportAssetEfficiency: true,
        reportCapitalStructure: true,
        reportSpendingPlan: true,
        reportInsurance: true,
        reportBackupPlans: true,
      },
    });

    if (!plan) {
      return { cacheIsValid: false, confirmedPurchaseYear: null, planExists: false };
    }

    if (!plan.confirmedPurchaseYear || !plan.reportGeneratedAt) {
      return { cacheIsValid: false, confirmedPurchaseYear: plan.confirmedPurchaseYear, planExists: true };
    }

    const isCacheFresh = (new Date().getTime() - new Date(plan.reportGeneratedAt).getTime()) < CACHE_EXPIRATION_MS;
    
    const allSectionsCached = 
      !!plan.reportAssetEfficiency &&
      !!plan.reportCapitalStructure &&
      !!plan.reportSpendingPlan &&
      !!plan.reportInsurance &&
      !!plan.reportBackupPlans;

    return { 
      cacheIsValid: isCacheFresh && allSectionsCached, 
      confirmedPurchaseYear: plan.confirmedPurchaseYear,
      planExists: true
    };

  } catch (error) {
    console.error("[CHECK_REPORT_CACHE_STATUS] Error:", error);
    // In case of an unexpected error, assume cache is not valid
    return { cacheIsValid: false, confirmedPurchaseYear: null, planExists: false };
  }
}
