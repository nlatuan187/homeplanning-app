import { Plan } from "@prisma/client";
import { generateProjections } from "./projections/generateProjections";
import { generateComparisonData, determineAffordabilityOutcome } from "./projections/generateComparisonData";
import { calculateLoanSummary } from "./projections/calculateLoanSummary";
import type { LoanSummary } from "./projections/calculateLoanSummary";

// Types for our projection data
export type ProjectionRow = {
  year: number;
  n: number; // Year index (0, 1, 2...)
  housePriceProjected: number;
  annualIncome: number;
  annualExpenses: number;
  annualSavings: number;
  cumulativeSavings: number;
  loanAmountNeeded: number;
  monthlyPayment: number;
  monthlySurplus: number;
  buffer: number;
  isAffordable: boolean;
  loanTermYears: number; // Add this to ensure it's passed through
  familyLoanRepayment: number; // Annual family loan repayment amount

  // Detailed numbers for context and debugging
  baseExpenses: number;

  // Additional fields from the specification
  pctHouseGrowth: number;
  pctSalaryGrowth: number;
  pctExpenseGrowth: number;
  pctInvestmentReturn: number;
  factorMarriage: number;
  factorChild: number;

  // Income components
  primaryIncome: number;
  otherIncome: number;
  spouseIncome: number;

  // Expense components
  preInsuranceExpenses: number;
  insurancePremium: number;

  // Emergency fund components
  targetEF: number;
  efTopUp: number;

  // Loan details
  ltvRatio: number;
};

export type ProjectionResult = {
  projectionData: ProjectionRow[];
  affordabilityOutcome: "ScenarioA" | "ScenarioB";
  firstViableYear: number | null;
  confirmedPurchaseYear: number | null;
  comparisonData: ComparisonData | null;
};

export type ComparisonData = {
  viableYears: {
    year: number;
    housePriceProjected: number;
    monthlySurplus: number;
    monthlyPayment: number;
    buffer: number;
    cumulativeSavings: number;
  }[];
};

// Main affordability calculation function - Refactored to use the new modular approach
export function calculateAffordability(plan: Plan): ProjectionResult {
  // Current year
  const currentYear = new Date().getFullYear();

  // Target purchase year
  const targetPurchaseYear = currentYear + plan.yearsToPurchase;

  // 1. Generate projections
  const projectionData = generateProjections(plan);

  // 2. Determine affordability outcome using corrected logic
  const { affordabilityOutcome, firstViableYear } = determineAffordabilityOutcome(
    projectionData,
    plan.yearsToPurchase
  );

  // 3. Generate comparison data if there's a viable year
  let comparisonData: ComparisonData | null = null;
  if (firstViableYear !== null) {
    comparisonData = generateComparisonData(
      projectionData,
      firstViableYear,
      targetPurchaseYear
    );
  }

  // Return the complete result
  return {
    projectionData,
    affordabilityOutcome,
    firstViableYear,
    confirmedPurchaseYear: plan.confirmedPurchaseYear,
    comparisonData
  };
}

// Export the loan summary calculation for use in the final report
export { calculateLoanSummary };
export type { LoanSummary };
