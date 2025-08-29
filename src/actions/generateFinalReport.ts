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
import { checkReportCacheStatus } from "./checkReportCacheStatus";

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

function extractUserContext(planReport: PrismaPlan): UserContext {
  if (planReport.confirmedPurchaseYear === null) {
    throw new Error(
      "Confirmed purchase year cannot be null when extracting user context for report."
    );
  }
  return {
    targetYear: new Date().getFullYear() + planReport.yearsToPurchase,
    targetHouseType: planReport.targetHouseType,
    targetLocation: planReport.targetLocation,
    pctHouseGrowth: planReport.pctHouseGrowth,
    pctSalaryGrowth: planReport.pctSalaryGrowth,
    pctExpenseGrowth: planReport.pctExpenseGrowth,
    pctInvestmentReturn: planReport.pctInvestmentReturn,
    confirmedPurchaseYear: planReport.confirmedPurchaseYear,
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
  console.log(`[generateFinalReport] Starting report generation for planId: ${planId}`);
  
  const { userId } = await auth();
  if (!userId) {
    console.error("[generateFinalReport] Error: User not authenticated.");
    throw new Error("User not authenticated");
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

  const planReport = await db.planReport.findUnique({
    where: {
      planId: planId,
    },
  });

  if (!plan) {
    throw new Error("Plan not found");
  }
  if (!planReport) {
    throw new Error("Plan report not found");
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
  planReport.generatedAt &&
    new Date().getTime() - new Date(planReport.generatedAt).getTime() <
      CACHE_EXPIRATION_MS;

  let reportSections: ReportSections;

  if (
    isCacheValid &&
    planReport.assetEfficiency &&
    planReport.capitalStructure &&
    planReport.spendingPlan &&
    planReport.insurance &&
    planReport.backupPlans
  ) {
    try {
      const sections = {
        assetEfficiency: tryParseJSON(planReport.assetEfficiency),
        capitalStructure: tryParseJSON(planReport.capitalStructure),
        spendingPlan: tryParseJSON(planReport.spendingPlan),
        insurance: tryParseJSON(planReport.insurance),
        backupPlans: tryParseJSON(planReport.backupPlans),
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
      await saveReportSections(planReport.id, reportSections);
    }
  } else {
    reportSections = await generateReportSections(
      plan,
      confirmedYearData,
      userContext,
      loanSummary,
      projectionData
    );
    await saveReportSections(planReport.id, reportSections);
  }

  return {
    success: true,
    plan,
    projectionData,
    confirmedYearData,
    loanSummary,
    reportSections,
  };
}

async function saveReportSections(planReportId: string, reportSections: ReportSections) {
  await db.planReport.update({
    where: { id: planReportId },
    data: {
      assetEfficiency: JSON.stringify(reportSections.assetEfficiency),
      capitalStructure: JSON.stringify(reportSections.capitalStructure),
      spendingPlan: JSON.stringify(reportSections.spendingPlan),
      insurance: JSON.stringify(reportSections.insurance),
      backupPlans: JSON.stringify(reportSections.backupPlans),
      generatedAt: new Date(),
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
    generateInsuranceSection(plan),
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