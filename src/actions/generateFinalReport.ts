"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { calculateLoanSummary } from "@/lib/calculations/projections/calculateLoanSummary";
import { ProjectionRow } from "@/lib/calculations/affordability";

// Import all section generators from the reportSections directory
import {
  generateAssetEfficiencySection,
  generateCapitalStructureSection,
  generateSpendingPlanSection,
  generateInsuranceSection,
  generateBackupPlansSection
  // generateRiskManagementSection and generateFuturePlanningSection removed
} from "./reportSections"; 
// NOTE: If generateRiskManagementSection and generateFuturePlanningSection are not in reportSections/index.ts, 
// their direct imports would also need to be removed if they were separate.
// Assuming they are exported from reportSections/index.ts for now.
// If not, the diff will need to target their specific import lines if they exist.
// Based on the plan, these files themselves will be deleted, so their exports from an index would also be gone.

// Cache expiration time (24 hours in milliseconds)
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

// Helper function to safely parse JSON
function tryParseJSON(jsonString: string | null): unknown | null { // Return unknown
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch { 
    return null;
  }
}

// Helper function to extract user context for AI analysis
// Assuming 'Plan' type is available and appropriate here
import { Plan as PrismaPlan } from "@prisma/client"; // Import Plan type

interface UserContext {
  maritalStatus: string; 
  hasDependents: boolean; 
  numberOfDependents: number; 
  plansMarriageBeforeTarget: boolean | null; 
  targetMarriageYear: number | null;
  plansChildBeforeTarget: boolean | null; 
  targetChildYear: number | null;
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
  if (plan.confirmedPurchaseYear === null) { // Add explicit check for confirmedPurchaseYear
    throw new Error("Confirmed purchase year cannot be null when extracting user context for report.");
  }
  return {
    maritalStatus: plan.maritalStatus, 
    hasDependents: plan.hasDependents ?? false, 
    numberOfDependents: plan.numberOfDependents ?? 0, 
    plansMarriageBeforeTarget: plan.plansMarriageBeforeTarget,
    targetMarriageYear: plan.targetMarriageYear,
    plansChildBeforeTarget: plan.plansChildBeforeTarget,
    targetChildYear: plan.targetChildYear,
    targetYear: new Date().getFullYear() + plan.yearsToPurchase,
    targetHouseType: plan.targetHouseType,
    targetLocation: plan.targetLocation,
    pctHouseGrowth: plan.pctHouseGrowth,
    pctSalaryGrowth: plan.pctSalaryGrowth,
    pctExpenseGrowth: plan.pctExpenseGrowth,
    pctInvestmentReturn: plan.pctInvestmentReturn,
    confirmedPurchaseYear: plan.confirmedPurchaseYear, // Now guaranteed to be number
  };
}

// Import the specific data types from each section generator
import { type AssetEfficiencyReportData } from "./reportSections/assetEfficiency";
import { type CapitalStructureReportData } from "./reportSections/capitalStructure";
import { type SpendingPlanReportData } from "./reportSections/spendingPlan";
import { type InsuranceReportData } from "./reportSections/insurance"; // Assuming this will be the exported type name
import { type BackupPlansReportData } from "./reportSections/backupPlans"; // Assuming this will be the exported type name

// Define the report sections using the imported types
// Also include potential error shapes if actions return them directly
type SectionData<T> = T | { error: true; message: string; details: string };

export interface ReportSections {
  assetEfficiency: SectionData<AssetEfficiencyReportData>;
  capitalStructure: SectionData<CapitalStructureReportData>;
  spendingPlan: SectionData<SpendingPlanReportData>;
  insurance: SectionData<InsuranceReportData>;
  backupPlans: SectionData<BackupPlansReportData>;
}

/**
 * Server Action 4: Final Report Generation
 *
 * This action:
 * 1. Receives planId
 * 2. Fetches plan data
 * 3. Checks if report sections are cached
 * 4. If cached and not expired, returns cached data
 * 5. If not cached, regenerates projections, calculates loan summary, generates report sections
 * 6. Saves generated sections to database
 * 7. Returns complete report data
 */
export async function generateFinalReport(planId: string) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Fetch the plan
    const plan = await db.plan.findUnique({
      where: {
        id: planId,
        userId,
      },
      select: { // Add explicit select
        id: true,
        userId: true,
        planName: true,
        createdAt: true,
        updatedAt: true,
        yearsToPurchase: true,
        targetHousePriceN0: true,
        targetHouseType: true,
        targetLocation: true,
        maritalStatus: true,
        hasDependents: true,
        numberOfDependents: true,
        plansMarriageBeforeTarget: true,
        targetMarriageYear: true,
        plansChildBeforeTarget: true,
        targetChildYear: true,
        initialSavingsGoal: true,
        incomeLastYear: true,
        monthlyOtherIncome: true,
        monthlyLivingExpenses: true,
        monthlyNonHousingDebt: true,
        currentAnnualInsurancePremium: true,
        spouseMonthlyIncome: true,
        pctHouseGrowth: true,
        pctSalaryGrowth: true,
        pctExpenseGrowth: true,
        pctInvestmentReturn: true,
        factorMarriage: true,
      factorChild: true,
      loanInterestRate: true,
      loanTermMonths: true,
      // paymentMethod: true, // Temporarily remove due to persistent TS error
      affordabilityOutcome: true,
      firstViableYear: true,
      confirmedPurchaseYear: true,
        // Report cache fields that are still in schema
        reportGeneratedAt: true,
        reportAssetEfficiency: true,
        reportCapitalStructure: true,
        reportSpendingPlan: true,
        reportInsurance: true,
        reportBackupPlans: true,
        // Other fields
        revisionCount: true,
        userEmail: true,
        buffer: true,
        revisionHistory: true,
      }
    });

    if (!plan) {
      throw new Error("Plan not found");
    }

    if (!plan.confirmedPurchaseYear) {
      throw new Error("No confirmed purchase year");
    }

    // Regenerate projections
    const projectionData = generateProjections(plan);

    // Find data for the confirmed year
    const confirmedYearData = projectionData.find(
      p => p.year === plan.confirmedPurchaseYear
    );

    if (!confirmedYearData) {
      throw new Error("Confirmed year data not found");
    }

    // Calculate loan summary
    const loanSummary = calculateLoanSummary(confirmedYearData);

    // Extract user context for AI analysis
    const userContext = extractUserContext(plan);

    // Check if report sections are cached and not expired
    const isCacheValid = plan.reportGeneratedAt &&
      (new Date().getTime() - new Date(plan.reportGeneratedAt).getTime() < CACHE_EXPIRATION_MS);

    let reportSections: ReportSections;

    if (isCacheValid &&
        plan.reportAssetEfficiency &&
        plan.reportCapitalStructure &&
        // plan.reportRiskManagement && // Removed
        plan.reportSpendingPlan &&
        plan.reportInsurance &&
        plan.reportBackupPlans // &&
        // plan.reportFuturePlanning // Removed
        ) {
      // Use cached report sections
      console.log("[GENERATE_FINAL_REPORT] Using cached report sections for 5 sections");
      
      try {
        // Try to parse each section individually to identify which one is causing the problem
        const sections = {
          assetEfficiency: tryParseJSON(plan.reportAssetEfficiency),
          capitalStructure: tryParseJSON(plan.reportCapitalStructure),
          // riskManagement: tryParseJSON(plan.reportRiskManagement), // Removed
          spendingPlan: tryParseJSON(plan.reportSpendingPlan),
          insurance: tryParseJSON(plan.reportInsurance),
          backupPlans: tryParseJSON(plan.reportBackupPlans),
          // futurePlanning: tryParseJSON(plan.reportFuturePlanning), // Removed
        };
        
        // Check if any section failed to parse
        const failedSections = Object.entries(sections)
          .filter(([, value]) => value === null)
          .map(([key]) => key);
        
        if (failedSections.length > 0) {
          console.error(`[GENERATE_FINAL_REPORT] Failed to parse sections: ${failedSections.join(', ')}`);
          throw new Error("Invalid cached data format");
        }
        
        // All sections parsed successfully
        reportSections = sections as ReportSections;
      } catch (parseError) {
        console.error("[GENERATE_FINAL_REPORT] Error parsing cached report sections:", parseError);
        
        // If parsing fails, regenerate the report sections
        reportSections = await generateReportSections(
          plan,
          confirmedYearData,
          userContext,
          loanSummary,
          projectionData
        );
        
        // Save the regenerated sections to the database
        await saveReportSections(planId, reportSections);
      }
    } else {
      // Generate new report sections
      console.log("[GENERATE_FINAL_REPORT] Generating new report sections");
      reportSections = await generateReportSections(
        plan,
        confirmedYearData,
        userContext,
        loanSummary,
        projectionData
      );
      
      // Save the generated sections to the database
      await saveReportSections(planId, reportSections);
    }

    // Return complete report data, now including the plan object
    return {
      success: true,
      plan, // Add the plan object here
      projectionData,
      confirmedYearData,
      loanSummary,
      reportSections,
    };
  } catch (error) {
    console.error("[GENERATE_FINAL_REPORT]", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while generating the final report.";
    console.error("[GENERATE_FINAL_REPORT] Detailed Error:", error); // Server log
    return {
      success: false,
      error: `Failed to generate final report: ${errorMessage}`, // To client
    };
  }
}

// Function to save report sections to the database
async function saveReportSections(planId: string, reportSections: ReportSections) {
  try {
    await db.plan.update({
      where: {
        id: planId,
      },
      data: {
        reportGeneratedAt: new Date(),
        reportAssetEfficiency: JSON.stringify(reportSections.assetEfficiency),
        reportCapitalStructure: JSON.stringify(reportSections.capitalStructure),
        // reportRiskManagement: JSON.stringify(reportSections.riskManagement), // Removed
        reportSpendingPlan: JSON.stringify(reportSections.spendingPlan),
        reportInsurance: JSON.stringify(reportSections.insurance),
        reportBackupPlans: JSON.stringify(reportSections.backupPlans),
        // reportFuturePlanning: JSON.stringify(reportSections.futurePlanning), // Removed
        // Do not attempt to set fields that no longer exist
        // reportRiskManagement: null, // Removed
        // reportFuturePlanning: null, // Removed
      },
    });
  } catch (error) {
    console.error("[SAVE_REPORT_SECTIONS]", error);
    throw new Error("Failed to save report sections");
  }
}

// Function to generate all report sections
async function generateReportSections(
  plan: PrismaPlan, // Use PrismaPlan type
  confirmedYearData: ProjectionRow,
  userContext: UserContext, // Use defined UserContext type
  loanSummary: ReturnType<typeof calculateLoanSummary>,
  projectionData: ProjectionRow[]
): Promise<ReportSections> {
  try {
    // Generate each section
    const results = await Promise.all([
      generateAssetEfficiencySection(plan, confirmedYearData, userContext, projectionData),
      generateCapitalStructureSection(plan, confirmedYearData, userContext),
      generateSpendingPlanSection(plan, confirmedYearData, loanSummary),
      generateInsuranceSection(plan),
      generateBackupPlansSection()
    ]);

    const [
      assetEfficiency,
      capitalStructure,
      spendingPlan,
      insurance,
      backupPlans,
    ] = results;

    // Check for errors in sub-sections
    const errorMessages: string[] = [];
    results.forEach((result, index) => {
      if (result && typeof result === 'object' && 'error' in result && (result as { error: boolean }).error) {
        const sectionNames = ["AssetEfficiency", "CapitalStructure", "SpendingPlan", "Insurance", "BackupPlans"];
        errorMessages.push(`Section ${sectionNames[index]}: ${(result as { message?: string }).message || 'Unknown error'}`);
      }
    });

    if (errorMessages.length > 0) {
      throw new Error(`Errors in generating report sections: ${errorMessages.join("; ")}`);
    }

    return {
      assetEfficiency,
      capitalStructure,
      spendingPlan,
      insurance,
      backupPlans,
    } as ReportSections; 
  } catch (error) {
    console.error("[GENERATE_REPORT_SECTIONS] Detailed Error:", error);
    // Re-throw the error to be caught by the main generateFinalReport catch block
    // This ensures the error message includes specifics from this function if it originated here.
    throw error instanceof Error ? error : new Error("Failed to generate report sections due to an unknown issue.");
  }
}
