import { ProjectionRow } from "../affordability";

export interface LoanSummary {
  loanAmount: number;
  downPaymentAmount: number;
  downPaymentPercentage: number;
  monthlyPayment: number;
  totalPayments: number;
  paymentToIncomeRatio: number;
  bufferAmount: number;
  bufferPercentage: number;
}

/**
 * Calculates detailed loan metrics for the final report
 */
export function calculateLoanSummary(yearData: ProjectionRow): LoanSummary {
  // Calculate loan metrics
  const loanAmount = yearData.loanAmountNeeded;
  const downPaymentAmount = yearData.cumulativeSavings;
  const downPaymentPercentage = (yearData.cumulativeSavings / yearData.housePriceProjected) * 100;
  const monthlyPayment = yearData.monthlyPayment;
  
  // Use the loan term from the projection data. Default to 0 if null/undefined.
  const loanTermYears = yearData.loanTermYears || 0;
  const totalPayments = monthlyPayment * 12 * loanTermYears;
  
  // Calculate payment to income ratio
  const monthlyIncome = yearData.annualIncome / 12;
  const paymentToIncomeRatio = (monthlyPayment / monthlyIncome) * 100;
  
  // Buffer metrics
  const bufferAmount = yearData.buffer;
  const bufferPercentage = (bufferAmount / monthlyPayment) * 100;
  
  return {
    loanAmount,
    downPaymentAmount,
    downPaymentPercentage,
    monthlyPayment,
    totalPayments,
    paymentToIncomeRatio,
    bufferAmount,
    bufferPercentage
  };
}
