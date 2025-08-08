// ✅ Updated: calculateAdditionalSavingsForViability moved to shared location
// File: src/lib/calculations/affordabilityHelpers.ts
import { ProjectionRow } from "./affordability";

export function calculateAdditionalSavingsForViability(
  targetYearProjection: ProjectionRow,
  loanInterestRateAnnual: number,
  loanTermYears: number
): number {
  const monthlyIncomeTargetYear = targetYearProjection.annualIncome / 12;
  const monthlyLivingExpensesTargetYear = targetYearProjection.annualExpenses / 12;

  const loanTermMonths = loanTermYears * 12;
  const maxAffordableMonthlyMortgage = monthlyIncomeTargetYear - monthlyLivingExpensesTargetYear;

  let additionalSavings: number;
  if (maxAffordableMonthlyMortgage <= 0) {
    additionalSavings = targetYearProjection.housePriceProjected - targetYearProjection.cumulativeSavings;
  } else {
    const monthlyInterestRate = loanInterestRateAnnual / 100 / 12;
    let maxLoanAmount = 0;
    if (monthlyInterestRate > 0) {
      maxLoanAmount = maxAffordableMonthlyMortgage *
        (1 - Math.pow(1 + monthlyInterestRate, -loanTermMonths)) /
        monthlyInterestRate;
    } else {
      maxLoanAmount = maxAffordableMonthlyMortgage * loanTermMonths;
    }
    maxLoanAmount = Math.max(0, maxLoanAmount);

    const minDownPaymentNeeded = Math.max(0, targetYearProjection.housePriceProjected - maxLoanAmount);
    const currentSavingsAtTargetYear = targetYearProjection.cumulativeSavings;
    additionalSavings = minDownPaymentNeeded - currentSavingsAtTargetYear;
  }

  return Math.round(Math.max(0, additionalSavings));
}

// 📦 Then, in PlaygroundPageClient.tsx:
// ✅ Import từ nơi mới

