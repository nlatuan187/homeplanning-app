"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { generateComparisonData } from "@/lib/calculations/projections/generateComparisonData";
import { ComparisonData } from "@/lib/calculations/affordability";

// Helper function to extract user context for AI analysis
function extractUserContext(plan: any) {
  return {
    maritalStatus: plan.maritalStatus,
    hasDependents: plan.hasDependents,
    numberOfDependents: plan.numberOfDependents,
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
  };
}

/**
 * Server Action 2: Intermediate Comparison & Analysis
 * 
 * This action:
 * 1. Receives planId
 * 2. Fetches plan data
 * 3. Regenerates projections
 * 4. Generates comparison data
 * 5. Calls Gemini API for intermediate analysis
 * 6. Returns comparison data and AI analysis
 */
export async function getComparisonData(planId: string) {
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
    });

    if (!plan) {
      throw new Error("Plan not found");
    }

    if (plan.affordabilityOutcome !== "ScenarioB" || !plan.firstViableYear) {
      throw new Error("This plan does not have viable years for comparison");
    }

    // Current year
    const currentYear = new Date().getFullYear();

    // Target purchase year
    const targetPurchaseYear = currentYear + plan.yearsToPurchase;

    // Regenerate projections
    const projectionData = generateProjections(plan);

    // Generate comparison data
    const comparisonData = generateComparisonData(
      projectionData,
      plan.firstViableYear,
      targetPurchaseYear
    );

    // Extract user context for AI analysis
    const userContext = extractUserContext(plan);

    // Call Gemini API for intermediate analysis
    const aiAnalysis = await generateIntermediateAnalysis(comparisonData, userContext);

    // Return comparison data and AI analysis
    return {
      success: true,
      comparisonData,
      aiAnalysis,
    };
  } catch (error) {
    console.error("[GET_COMPARISON_DATA]", error);
    return {
      success: false,
      error: "Failed to get comparison data",
    };
  }
}

// Function to call Gemini API for intermediate analysis
async function generateIntermediateAnalysis(
  comparisonData: ComparisonData,
  userContext: any
): Promise<string> {
  try {
    // Call the Gemini API
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comparisonData,
        userContext,
        reportType: "intermediate"
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch analysis");
    }

    const data = await response.json();
    return data.analysis;
  } catch (error) {
    console.error("Error generating intermediate analysis:", error);
    return "Không thể tạo phân tích chi tiết. Vui lòng thử lại sau.";
  }
}
