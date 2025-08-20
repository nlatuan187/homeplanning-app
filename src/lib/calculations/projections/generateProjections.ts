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
export type PlanWithDetails = Plan & {
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
export function generateProjections(plan: Plan, maxYearsToProject?: number): ProjectionRow[] {
  const currentYear = plan.createdAt.getFullYear();
  const currentMonth = plan.createdAt.getMonth();
  const maxYears = maxYearsToProject || (plan.yearsToPurchase + 5);
  const projectionData: ProjectionRow[] = [];

  let initialSavings = plan.initialSavings;
  if (plan.familySupport?.familySupportType === 'GIFT' && plan.familySupport?.familyGiftTiming === 'NOW' && plan.familySupport?.familySupportAmount) {
    initialSavings += plan.familySupport.familySupportAmount;
  }

  // Monthly rate from annual compound interest
  const annualReturnRate = plan.pctInvestmentReturn / 100;
  const monthlyRate = Math.pow(1 + annualReturnRate, 1 / 12) - 1;
  console.log("monthlyRate", monthlyRate)

  const userMonthlyIncomeN0 = plan.userMonthlyIncome;
  const coApplicantMonthlyIncomeN0 = plan.hasCoApplicant ? (plan.coApplicantMonthlyIncome || 0) : 0;
  const otherMonthlyIncomeN0 = plan.monthlyOtherIncome || 0;
  const totalMonthlyIncomeN0 = userMonthlyIncomeN0 + coApplicantMonthlyIncomeN0 + otherMonthlyIncomeN0;
  const annualIncomeN0 = totalMonthlyIncomeN0 * 12;

  const monthlyExpensesN0 = plan.monthlyLivingExpenses + (plan.monthlyNonHousingDebt || 0) + ((plan.currentAnnualInsurancePremium || 0) / 12);
  const annualExpensesN0 = monthlyExpensesN0 * 12;
  const annualSavingsN0 = annualIncomeN0 - annualExpensesN0
  const cumulativeSavingsFromInitialN0 = initialSavings
  const cumulativeSavingsFromMonthlyN0 = annualSavingsN0 / 12

  const targetEFN0 = monthlyExpensesN0 * 6;
  const paymentMethod = (plan as PlanWithPaymentMethod).paymentMethod || "fixed";
  const cumulativeSavingsN0 = cumulativeSavingsFromInitialN0 + cumulativeSavingsFromMonthlyN0

  const year0: ProjectionRow = {
    year: currentYear,
    n: 0,
    housePriceProjected: plan.targetHousePriceN0,//
    primaryIncome: userMonthlyIncomeN0 * 12, //
    spouseIncome: coApplicantMonthlyIncomeN0 * 12,//
    otherIncome: otherMonthlyIncomeN0 * 12,//
    annualIncome: annualIncomeN0,
    annualExpenses: annualExpensesN0,
    annualSavings: annualSavingsN0,
    cumulativeSavings: cumulativeSavingsN0,
    loanAmountNeeded: Math.max(0, plan.targetHousePriceN0 - initialSavings),
    monthlyPayment: 0,
    monthlySurplus: annualSavingsN0 / 12,
    buffer: 0,
    isAffordable: false,
    baseExpenses: plan.monthlyLivingExpenses * 12, //
    preInsuranceExpenses: (plan.monthlyLivingExpenses + (plan.monthlyNonHousingDebt || 0)) * 12,
    insurancePremium: plan.currentAnnualInsurancePremium || 0,
    targetEF: targetEFN0,
    efTopUp: 0,
    ltvRatio: 0,
    pctHouseGrowth: plan.pctHouseGrowth,
    pctSalaryGrowth: plan.pctSalaryGrowth,
    pctExpenseGrowth: plan.pctExpenseGrowth,
    pctInvestmentReturn: plan.pctInvestmentReturn,
    factorMarriage: 0,
    factorChild: 0,
    loanTermYears: plan.loanTermYears,
    cumulativeSavingsFromInitial: cumulativeSavingsFromInitialN0,
    cumulativeSavingsFromMonthly: 0,
  };

  year0.loanAmountNeeded = Math.max(0, year0.housePriceProjected - year0.cumulativeSavings);
  year0.ltvRatio = year0.housePriceProjected > 0 ? (year0.loanAmountNeeded / year0.housePriceProjected) * 100 : 0;
  year0.monthlyPayment = calculateMonthlyPayment(year0.loanAmountNeeded, plan.loanInterestRate, plan.loanTermYears, paymentMethod);
  year0.buffer = year0.monthlySurplus - year0.monthlyPayment;
  year0.isAffordable = year0.buffer >= 0;

  projectionData.push(year0);

  for (let n = 1; n <= maxYears; n++) {
    let prev = projectionData[n - 1];

    let accumulatedFromMonthly = prev.cumulativeSavingsFromMonthly + prev.annualSavings / 12 * (Math.pow(1 + monthlyRate, 12 - currentMonth) - 1) / monthlyRate;
    let accumulatedFromInitial = prev.cumulativeSavingsFromInitial * Math.pow(1 + monthlyRate, 12 - currentMonth);

    const userAnnualIncome = prev.primaryIncome * (1 + plan.pctSalaryGrowth / 100);
    const coApplicantAnnualIncome = prev.spouseIncome * (1 + (plan.coApplicantSalaryGrowth ?? plan.pctSalaryGrowth) / 100);
    const otherAnnualIncome = prev.otherIncome;
    const totalAnnualIncome = userAnnualIncome + coApplicantAnnualIncome + otherAnnualIncome;

    const livingExpensesAnnual = prev.baseExpenses * (1 + plan.pctExpenseGrowth / 100);
    const nonHousingDebtAnnual = (plan.monthlyNonHousingDebt || 0) * 12;
    const insuranceAnnual = plan.currentAnnualInsurancePremium || 0;
    const totalAnnualExpenses = livingExpensesAnnual + nonHousingDebtAnnual + insuranceAnnual;

    let annualSavings = totalAnnualIncome - totalAnnualExpenses;

    let annualFamilyLoanRepayment = 0;
    if (n > plan.yearsToPurchase && plan.familySupport?.familySupportType === 'LOAN') {
      const { familySupportAmount = 0, familyLoanTermYears = 0, familyLoanRepaymentType } = plan.familySupport;
      const yearsSincePurchase = n - plan.yearsToPurchase;

      if (familySupportAmount > 0 && familyLoanTermYears > 0 && yearsSincePurchase <= familyLoanTermYears) {
        if (familyLoanRepaymentType === 'MONTHLY') {
          annualFamilyLoanRepayment = familySupportAmount / familyLoanTermYears;
        } else if (familyLoanRepaymentType === 'LUMP_SUM' && yearsSincePurchase === familyLoanTermYears) {
          annualFamilyLoanRepayment = familySupportAmount;
        }
      }
    }
    annualSavings -= annualFamilyLoanRepayment;

    const monthlyNewSavings = annualSavings / 12;

    accumulatedFromInitial *= Math.pow(1 + monthlyRate, currentMonth);

    const fvOfCurrentYearMonthlySavings = (monthlyRate > 0)
      ? monthlyNewSavings * (Math.pow(1 + monthlyRate, currentMonth) - 1) / monthlyRate
      : monthlyNewSavings * currentMonth;

    accumulatedFromMonthly *= Math.pow(1 + monthlyRate, currentMonth);
    accumulatedFromMonthly += fvOfCurrentYearMonthlySavings;

    const cumulativeSavings = accumulatedFromInitial + accumulatedFromMonthly;

    const housePriceProjected = prev.housePriceProjected * (1 + plan.pctHouseGrowth / 100);

    let equityForPurchase = cumulativeSavings;
    if (n === plan.yearsToPurchase && plan.familySupport?.familySupportType === 'GIFT' && plan.familySupport?.familyGiftTiming === 'AT_PURCHASE' && plan.familySupport?.familySupportAmount) {
      equityForPurchase += plan.familySupport.familySupportAmount;
    }

    const familyLoanAmount = (n === plan.yearsToPurchase && plan.familySupport?.familySupportType === 'LOAN')
      ? (plan.familySupport.familySupportAmount || 0)
      : 0;

    const bankLoanNeeded = Math.max(0, housePriceProjected - equityForPurchase - familyLoanAmount);
    const ltvRatio = housePriceProjected > 0 ? (bankLoanNeeded / housePriceProjected) * 100 : 0;

    const monthlyPayment = calculateMonthlyPayment(bankLoanNeeded, plan.loanInterestRate ?? 0, plan.loanTermYears ?? 0, paymentMethod);
    const monthlySurplus = annualSavings / 12;
    const buffer = monthlySurplus - monthlyPayment;
    const isAffordable = buffer >= 0;

    projectionData.push({
      year: currentYear + n,
      n,
      housePriceProjected,
      primaryIncome: userAnnualIncome,
      spouseIncome: coApplicantAnnualIncome,
      otherIncome: otherAnnualIncome,
      annualIncome: totalAnnualIncome,
      annualExpenses: totalAnnualExpenses,
      annualSavings,
      cumulativeSavings: cumulativeSavings,
      loanAmountNeeded: bankLoanNeeded,
      monthlyPayment,
      monthlySurplus,
      buffer,
      isAffordable,
      loanTermYears: plan.loanTermYears,
      familyLoanRepayment: annualFamilyLoanRepayment,
      baseExpenses: livingExpensesAnnual,
      preInsuranceExpenses: livingExpensesAnnual + nonHousingDebtAnnual,
      insurancePremium: insuranceAnnual,
      targetEF: (livingExpensesAnnual + nonHousingDebtAnnual) / 12 * 6,
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
    });
  }

  return projectionData;
}
