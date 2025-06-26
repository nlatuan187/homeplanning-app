"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { calculateLoanSummary } from "@/lib/calculations/projections/calculateLoanSummary";
import { ProjectionRow } from "@/lib/calculations/affordability";
import {
  generateAssetEfficiencySection,
  generateCapitalStructureSection,
  generateSpendingPlanSection,
  generateInsuranceSection,
  generateBackupPlansSection,
} from "./reportSections";
import { Plan as PrismaPlan } from "@prisma/client";

const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

function tryParseJSON(jsonString: string | null): unknown | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

export interface UserContext {
  targetYear: number;
  targetHouseType: string | null;
  targetLocation: string | null;
  pctHouseGrowth: number;
  pctSalaryGrowth: number;
  pctExpenseGrowth: number;
  pctInvestmentReturn: number;
  confirmedPurchaseYear: number;
}

function extractUserContext(plan: PrismaPlan): UserContext {
  if (plan.confirmedPurchaseYear === null) {
    throw new Error(
      "Confirmed purchase year cannot be null when extracting user context for report."
    );
  }
  return {
    targetYear: new Date().getFullYear() + plan.yearsToPurchase,
    targetHouseType: plan.targetHouseType,
    targetLocation: plan.targetLocation,
    pctHouseGrowth: plan.pctHouseGrowth,
    pctSalaryGrowth: plan.pctSalaryGrowth,
    pctExpenseGrowth: plan.pctExpenseGrowth,
    pctInvestmentReturn: plan.pctInvestmentReturn,
    confirmedPurchaseYear: plan.confirmedPurchaseYear,
  };
}

import { type AssetEfficiencyReportData } from "./reportSections/assetEfficiency";
import { type CapitalStructureReportData } from "./reportSections/capitalStructure";
import { type SpendingPlanReportData } from "./reportSections/spendingPlan";
import { type InsuranceReportData } from "./reportSections/insurance";
import { type BackupPlansReportData } from "./reportSections/backupPlans";

type SectionData<T> = T | { error: true; message: string; details: string };

export interface ReportSections {
  assetEfficiency: SectionData<AssetEfficiencyReportData>;
  capitalStructure: SectionData<CapitalStructureReportData>;
  spendingPlan: SectionData<SpendingPlanReportData>;
  insurance: SectionData<InsuranceReportData>;
  backupPlans: SectionData<BackupPlansReportData>;
}

export async function generateFinalReport(planId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const plan = await db.plan.findUnique({
      where: {
        id: planId,
        userId,
      },
      include: {
        familySupport: true,
      },
    });

    if (!plan) {
      throw new Error("Plan not found");
    }

    if (!plan.confirmedPurchaseYear) {
      throw new Error("No confirmed purchase year");
    }

    const projectionData = generateProjections(plan);

    const confirmedYearData = projectionData.find(
      (p) => p.year === plan.confirmedPurchaseYear
    );

    if (!confirmedYearData) {
      throw new Error("Confirmed year data not found");
    }

    const loanSummary = calculateLoanSummary(confirmedYearData);
    const userContext = extractUserContext(plan);

    const isCacheValid =
      plan.reportGeneratedAt &&
      new Date().getTime() - new Date(plan.reportGeneratedAt).getTime() <
        CACHE_EXPIRATION_MS;

    let reportSections: ReportSections;

    if (
      isCacheValid &&
      plan.reportAssetEfficiency &&
      plan.reportCapitalStructure &&
      plan.reportSpendingPlan &&
      plan.reportInsurance &&
      plan.reportBackupPlans
    ) {
      try {
        const sections = {
          assetEfficiency: tryParseJSON(plan.reportAssetEfficiency),
          capitalStructure: tryParseJSON(plan.reportCapitalStructure),
          spendingPlan: tryParseJSON(plan.reportSpendingPlan),
          insurance: tryParseJSON(plan.reportInsurance),
          backupPlans: tryParseJSON(plan.reportBackupPlans),
        };
        const failedSections = Object.entries(sections)
          .filter(([, value]) => value === null)
          .map(([key]) => key);
        if (failedSections.length > 0) {
          throw new Error(`Invalid cached data format for: ${failedSections.join(", ")}`);
        }
        reportSections = sections as ReportSections;
      } catch {
        reportSections = await generateReportSections(
          plan,
          confirmedYearData,
          userContext,
          loanSummary,
          projectionData
        );
        await saveReportSections(planId, reportSections);
      }
    } else {
      reportSections = await generateReportSections(
        plan,
        confirmedYearData,
        userContext,
        loanSummary,
        projectionData
      );
      await saveReportSections(planId, reportSections);
    }

    return {
      success: true,
      plan,
      projectionData,
      confirmedYearData,
      loanSummary,
      reportSections,
    };
  } catch (error) {
    console.error("[GENERATE_FINAL_REPORT] Error", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      success: false,
      error: `Failed to generate final report: ${errorMessage}`,
    };
  }
}

async function saveReportSections(planId: string, reportSections: ReportSections) {
  await db.plan.update({
    where: { id: planId },
    data: {
      reportAssetEfficiency: JSON.stringify(reportSections.assetEfficiency),
      reportCapitalStructure: JSON.stringify(reportSections.capitalStructure),
      reportSpendingPlan: JSON.stringify(reportSections.spendingPlan),
      reportInsurance: JSON.stringify(reportSections.insurance),
      reportBackupPlans: JSON.stringify(reportSections.backupPlans),
      reportGeneratedAt: new Date(),
    },
  });
}

async function generateReportSections(
  plan: PrismaPlan,
  confirmedYearData: ProjectionRow,
  userContext: UserContext,
  loanSummary: ReturnType<typeof calculateLoanSummary>,
  projectionData: ProjectionRow[]
): Promise<ReportSections> {
  const [
    assetEfficiency,
    capitalStructure,
    spendingPlan,
    insurance,
    backupPlans,
  ] = await Promise.allSettled([
    generateAssetEfficiencySection(
      plan,
      confirmedYearData,
      userContext,
      projectionData
    ),
    generateCapitalStructureSection(plan, confirmedYearData, loanSummary),
    generateSpendingPlanSection(plan, confirmedYearData, projectionData),
    generateInsuranceSection(plan, userContext),
    generateBackupPlansSection(plan, userContext, projectionData),
  ]);

  const processSettledResult = <T>(
    result: PromiseSettledResult<T>,
    sectionName: string
  ): SectionData<T> => {
    if (result.status === "fulfilled") {
      return result.value as T;
    }
    console.error(`Error generating ${sectionName} section:`, result.reason);
    const details =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
    return {
      error: true,
      message: "Chúng tôi gặp sự cố khi tạo phần này. Vui lòng làm mới trang để thử lại.",
      details: details,
    };
  };

  return {
    assetEfficiency: processSettledResult(assetEfficiency, "Asset Efficiency"),
    capitalStructure: processSettledResult(capitalStructure, "Capital Structure"),
    spendingPlan: processSettledResult(spendingPlan, "Spending Plan"),
    insurance: processSettledResult(insurance, "Insurance"),
    backupPlans: processSettledResult(backupPlans, "Backup Plans"),
  };
}