import { Plan } from "@prisma/client";
import { ProjectionRow } from "../affordability";

// Define a more specific type for the plan object to satisfy TypeScript
type PlanWithPaymentMethod = Plan & {
  paymentMethod: "fixed" | "decreasing";
};

/**
 * A more specific type for the plan object that includes nested family support.
 * This ensures TypeScript understands the full data structure we're working with.
 */
type PlanWithDetails = Plan & {
  paymentMethod: "fixed" | "decreasing";
  familySupport?: {
    familySupportType: 'GIFT' | 'LOAN' | null;
    familySupportAmount: number | null;
    familyGiftTiming: 'NOW' | 'AT_PURCHASE' | null;
    familyLoanRepaymentType: 'LUMP_SUM' | 'MONTHLY' | null;
    familyLoanInterestRate: number | null;
    familyLoanTermYears: number | null;
  } | null;
};

/**
 * Calculates the monthly mortgage payment based on loan details.
 * Supports both fixed and decreasing payment methods.
 */
function calculateMonthlyPayment(
  loanAmount: number,
  annualInterestRate: number,
  termYears: number,
  paymentMethod: "fixed" | "decreasing" = "fixed"
): number {
  if (loanAmount <= 0) return 0;

  const termMonths = termYears * 12;
  const monthlyRate = annualInterestRate / 12 / 100;

  if (monthlyRate === 0) return loanAmount / termMonths;

  if (paymentMethod === "fixed") {
    // Standard fixed-rate mortgage calculation
    return (
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1)
    );
  } else {
    // For decreasing payment method, calculate the first month's payment
    const monthlyPrincipal = loanAmount / termMonths;
    const firstMonthInterest = loanAmount * monthlyRate;
    return monthlyPrincipal + firstMonthInterest;
  }
}

/**
 * Generates financial projections based on the new, simplified Plan model.
 * This is the core calculation engine for the application.
 */
export function generateProjections(plan: PlanWithDetails, maxYearsToProject?: number): ProjectionRow[] {
  const currentYear = new Date().getFullYear();
  const maxYears = maxYearsToProject || (plan.yearsToPurchase + 5);
  const projectionData: ProjectionRow[] = [];

  // --- Year 0 (Current State) Initialization ---

  // Start with user's own savings
  let initialSavings = plan.initialSavings;
  // If user gets a gift NOW, add it to initial savings to let it grow.
  if (plan.familySupport?.familySupportType === 'GIFT' && plan.familySupport?.familyGiftTiming === 'NOW' && plan.familySupport?.familySupportAmount) {
    initialSavings += plan.familySupport.familySupportAmount;
  }

  const userMonthlyIncomeN0 = plan.userMonthlyIncome;
  const coApplicantMonthlyIncomeN0 = plan.hasCoApplicant ? (plan.coApplicantMonthlyIncome || 0) : 0;
  const otherMonthlyIncomeN0 = plan.monthlyOtherIncome || 0;

  const totalMonthlyIncomeN0 = userMonthlyIncomeN0 + coApplicantMonthlyIncomeN0 + otherMonthlyIncomeN0;
  const annualIncomeN0 = totalMonthlyIncomeN0 * 12;

  const monthlyExpensesN0 = plan.monthlyLivingExpenses + (plan.monthlyNonHousingDebt || 0) + ((plan.currentAnnualInsurancePremium || 0) / 12);
  const annualExpensesN0 = monthlyExpensesN0 * 12;

  const annualSavingsN0 = annualIncomeN0 - annualExpensesN0;

  // Emergency Fund (EF) is not explicitly part of the new flow, but we can calculate it for context.
  // We will assume initialSavings is purely for the house down payment and not double-counted for EF.
  const targetEFN0 = monthlyExpensesN0 * 6;

  // Use the extended type to access paymentMethod without 'any'
  const paymentMethod = (plan as unknown as PlanWithPaymentMethod).paymentMethod || "fixed";

  const year0: ProjectionRow = {
    year: currentYear,
    n: 0,
    housePriceProjected: plan.targetHousePriceN0,
    primaryIncome: userMonthlyIncomeN0 * 12,
    spouseIncome: coApplicantMonthlyIncomeN0 * 12,
    otherIncome: otherMonthlyIncomeN0 * 12,
    annualIncome: annualIncomeN0,
    annualExpenses: annualExpensesN0,
    annualSavings: annualSavingsN0,
    cumulativeSavings: initialSavings, // Use the potentially adjusted initial savings
    loanAmountNeeded: Math.max(0, plan.targetHousePriceN0 - initialSavings),
    monthlyPayment: 0, // Calculated below
    monthlySurplus: annualSavingsN0 / 12,
    buffer: 0, // Calculated below
    isAffordable: false, // Calculated below

    // Other fields for context, simplifying or removing obsolete ones
    baseExpenses: plan.monthlyLivingExpenses * 12, // For tracking growth
    preInsuranceExpenses: (plan.monthlyLivingExpenses + (plan.monthlyNonHousingDebt || 0)) * 12,
    insurancePremium: plan.currentAnnualInsurancePremium || 0,
    targetEF: targetEFN0,
    efTopUp: 0, // Simplified: EF is assumed managed outside this projection for now
    ltvRatio: 0,
    pctHouseGrowth: plan.pctHouseGrowth,
    pctSalaryGrowth: plan.pctSalaryGrowth,
    pctExpenseGrowth: plan.pctExpenseGrowth,
    pctInvestmentReturn: plan.pctInvestmentReturn,
    factorMarriage: 0, // Obsolete
    factorChild: 0,    // Obsolete
    loanTermYears: plan.loanTermYears,
    cumulativeSavingsFromInitial: initialSavings,
    cumulativeSavingsFromMonthly: 0,
  };

  year0.loanAmountNeeded = Math.max(0, year0.housePriceProjected - year0.cumulativeSavings);
  year0.ltvRatio = year0.housePriceProjected > 0 ? (year0.loanAmountNeeded / year0.housePriceProjected) * 100 : 0;
  year0.monthlyPayment = calculateMonthlyPayment(year0.loanAmountNeeded, plan.loanInterestRate, plan.loanTermYears, paymentMethod);
  year0.buffer = year0.monthlySurplus - year0.monthlyPayment;
  year0.isAffordable = year0.buffer >= 0;

  projectionData.push(year0);

  // --- Projection Loop for Future Years ---
  let accumulatedFromInitial = initialSavings;
  let accumulatedFromMonthly = 0;

  for (let n = 1; n <= maxYears; n++) {
    const prevYear = projectionData[n - 1];

    // Income and expense projections remain the same
    const userAnnualIncome = prevYear.primaryIncome * (1 + (plan.pctSalaryGrowth / 100));
    const coApplicantAnnualIncome = prevYear.spouseIncome * (1 + ((plan.coApplicantSalaryGrowth ?? plan.pctSalaryGrowth) / 100));
    const otherAnnualIncome = prevYear.otherIncome;
    const totalAnnualIncome = userAnnualIncome + coApplicantAnnualIncome + otherAnnualIncome;

    const livingExpensesAnnual = prevYear.baseExpenses * (1 + (plan.pctExpenseGrowth / 100));
    const nonHousingDebtAnnual = (plan.monthlyNonHousingDebt || 0) * 12;
    const insuranceAnnual = plan.currentAnnualInsurancePremium || 0;
    const totalAnnualExpenses = livingExpensesAnnual + nonHousingDebtAnnual + insuranceAnnual;

    // Initial annual savings before deducting family loan repayments
    let annualSavings = totalAnnualIncome - totalAnnualExpenses;

    // --- Family Loan Repayment Calculation ---
    // This now happens for years *after* the house purchase year.
    let annualFamilyLoanRepayment = 0;
    if (n > plan.yearsToPurchase && plan.familySupport?.familySupportType === 'LOAN') {
      const familyLoanInfo = plan.familySupport;
      const yearsSincePurchase = n - plan.yearsToPurchase;
      const familyLoanTerm = familyLoanInfo.familyLoanTermYears ?? 0;
      const familyLoanAmount = familyLoanInfo.familySupportAmount ?? 0;

      // Check if we are within the family loan repayment period
      if (familyLoanAmount > 0 && familyLoanTerm > 0 && yearsSincePurchase <= familyLoanTerm) {
        if (familyLoanInfo.familyLoanRepaymentType === 'MONTHLY') {
          // For now, assume a simple interest-free loan repayment schedule
          annualFamilyLoanRepayment = familyLoanAmount / familyLoanTerm;
        } else if (familyLoanInfo.familyLoanRepaymentType === 'LUMP_SUM' && yearsSincePurchase === familyLoanTerm) {
          // For a lump sum, the full amount is due in the final year of the term.
          annualFamilyLoanRepayment = familyLoanAmount;
        }
      }
    }

    // Subtract the family loan repayment from the user's annual savings.
    // This correctly impacts how much they can save each year *after* buying the house.
    annualSavings -= annualFamilyLoanRepayment;

    // Savings Projection
    // Lãi suất hàng năm (dưới dạng thập phân)
    const annualReturnRate = plan.pctInvestmentReturn / 100;

    // 1. Tăng trưởng phần tiết kiệm ban đầu (lãi kép)
    accumulatedFromInitial = accumulatedFromInitial * (1 + annualReturnRate);

    // 2. Tăng trưởng phần tích lũy hàng năm (lãi kép gộp từng năm)
    accumulatedFromMonthly = accumulatedFromMonthly * (1 + annualReturnRate) + annualSavings;

    // 3. Tổng cộng
    const cumulativeSavings = accumulatedFromInitial + accumulatedFromMonthly;

    const housePriceProjected = prevYear.housePriceProjected * (1 + (plan.pctHouseGrowth / 100));

    // --- New Loan Calculation Logic ---

    // 1. Start with user's own accumulated savings
    let equityForPurchase = cumulativeSavings;

    // 2. Add gift if it's timed for the year of purchase
    if (n === plan.yearsToPurchase && plan.familySupport?.familySupportType === 'GIFT' && plan.familySupport?.familyGiftTiming === 'AT_PURCHASE' && plan.familySupport?.familySupportAmount) {
      equityForPurchase += plan.familySupport.familySupportAmount;
    }

    // 3. Determine the family loan amount (if any)
    const familyLoanAmount = (n === plan.yearsToPurchase && plan.familySupport?.familySupportType === 'LOAN' && plan.familySupport?.familySupportAmount)
      ? plan.familySupport.familySupportAmount
      : 0;

    // 4. Calculate the required bank loan
    const bankLoanNeeded = Math.max(0, housePriceProjected - equityForPurchase - familyLoanAmount);

    const ltvRatio = housePriceProjected > 0 ? (bankLoanNeeded / housePriceProjected) * 100 : 0;

    // 5. Monthly payment is based ONLY on the bank loan
    const monthlyPayment = calculateMonthlyPayment(bankLoanNeeded, plan.loanInterestRate, plan.loanTermYears, paymentMethod);
    const monthlySurplus = annualSavings / 12;
    const buffer = monthlySurplus - monthlyPayment;
    const isAffordable = buffer >= 0;

    const yearData: ProjectionRow = {
      year: currentYear + n,
      n,
      housePriceProjected,
      primaryIncome: userAnnualIncome,
      spouseIncome: coApplicantAnnualIncome,
      otherIncome: otherAnnualIncome,
      annualIncome: totalAnnualIncome,
      annualExpenses: totalAnnualExpenses,
      annualSavings,
      cumulativeSavings: cumulativeSavings, // This remains the user's growing savings pot
      loanAmountNeeded: bankLoanNeeded, // This now correctly represents the bank loan
      monthlyPayment,
      monthlySurplus,
      buffer,
      isAffordable,
      loanTermYears: plan.loanTermYears,
      familyLoanRepayment: annualFamilyLoanRepayment, // Pass repayment to frontend

      // Contextual fields
      baseExpenses: livingExpensesAnnual,
      preInsuranceExpenses: livingExpensesAnnual + nonHousingDebtAnnual,
      insurancePremium: insuranceAnnual,
      targetEF: ((livingExpensesAnnual + nonHousingDebtAnnual) / 12) * 6,
      efTopUp: 0,
      ltvRatio,
      pctHouseGrowth: plan.pctHouseGrowth,
      pctSalaryGrowth: plan.pctSalaryGrowth,
      pctExpenseGrowth: plan.pctExpenseGrowth,
      pctInvestmentReturn: plan.pctInvestmentReturn,
      factorMarriage: 0,
      factorChild: 0,

      cumulativeSavingsFromInitial: accumulatedFromInitial,
      cumulativeSavingsFromMonthly: accumulatedFromMonthly,
    };
    projectionData.push(yearData);
  }

  return projectionData;
}
