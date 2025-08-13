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
  const currentYear = new Date().getFullYear();
  const maxYears = maxYearsToProject || (plan.yearsToPurchase + 5);
  const projectionData: ProjectionRow[] = [];

  let initialSavings = plan.initialSavings;
  if (plan.familySupport?.familySupportType === 'GIFT' && plan.familySupport?.familyGiftTiming === 'NOW' && plan.familySupport?.familySupportAmount) {
    initialSavings += plan.familySupport.familySupportAmount;
  }

  // Monthly rate from annual compound interest
  const annualReturnRate = plan.pctInvestmentReturn / 100;
  const monthlyRate = Math.pow(1 + annualReturnRate, 1 / 12) - 1;
  console.log("monthlyRate", monthlyRate);

  const createMonth = plan.createdAt.getMonth();

  const userMonthlyIncomeN0 = plan.userMonthlyIncome;
  const coApplicantMonthlyIncomeN0 = plan.hasCoApplicant ? (plan.coApplicantMonthlyIncome || 0) : 0;
  const otherMonthlyIncomeN0 = plan.monthlyOtherIncome || 0;
  const totalMonthlyIncomeN0 = userMonthlyIncomeN0 + coApplicantMonthlyIncomeN0 + otherMonthlyIncomeN0;
  const annualIncomeN0 = totalMonthlyIncomeN0 * 12;

  // === LOGIC MỚI: Tính toán rõ ràng và rành mạch ===
  // 1. Chi tiêu cơ bản (không bao gồm bảo hiểm)
  const baseAnnualLivingExpenses = plan.monthlyLivingExpenses * 12;
  const annualNonHousingDebt = (plan.monthlyNonHousingDebt || 0) * 12;
  const baseAnnualExpenses = baseAnnualLivingExpenses + annualNonHousingDebt;

  // 2. Tính toán bảo hiểm theo logic mới
  const recommendedInsuranceAmount = Math.round(baseAnnualExpenses * 0.125);
  const currentInsuranceAmount = plan.currentAnnualInsurancePremium || 0;

  // 3. Xác định phí bảo hiểm cuối cùng
  // Logic này sẽ được xử lý trong PlaygroundPageClient dựa trên toggle
  // Ở đây chúng ta sẽ sử dụng currentInsuranceAmount làm default
  const finalInsurancePremium = currentInsuranceAmount;

  // 4. Tổng chi tiêu cuối cùng
  const totalAnnualExpensesN0 = baseAnnualExpenses + finalInsurancePremium;
  const annualSavingsN0 = annualIncomeN0 - totalAnnualExpensesN0;

  const cumulativeSavingsFromInitialN0 = initialSavings * Math.pow(1 + monthlyRate, 12 - createMonth + 1);
  const cumulativeSavingsFromMonthlyN0 = annualSavingsN0 / 12 * (Math.pow(1 + monthlyRate, 12 - createMonth + 1) - 1) / monthlyRate;
  const cumulativeSavingsN0 = cumulativeSavingsFromInitialN0 + cumulativeSavingsFromMonthlyN0;

  // 5. Quỹ dự phòng (6 tháng chi tiêu cơ bản)
  const targetEFN0 = (plan.monthlyLivingExpenses + (plan.monthlyNonHousingDebt || 0)) * 6;

  const paymentMethod = (plan as PlanWithPaymentMethod).paymentMethod || "fixed";

  const year0: ProjectionRow = {
    year: currentYear,
    n: 0,
    housePriceProjected: plan.targetHousePriceN0,
    primaryIncome: userMonthlyIncomeN0 * 12,
    spouseIncome: coApplicantMonthlyIncomeN0 * 12,
    otherIncome: otherMonthlyIncomeN0 * 12,
    annualIncome: annualIncomeN0,
    annualExpenses: totalAnnualExpensesN0, // Tổng chi tiêu đã bao gồm bảo hiểm
    annualSavings: annualSavingsN0,
    cumulativeSavings: cumulativeSavingsN0,
    loanAmountNeeded: Math.max(0, plan.targetHousePriceN0 - initialSavings),
    monthlyPayment: 0,
    monthlySurplus: annualSavingsN0 / 12,
    buffer: 0,
    isAffordable: false,
    // === CẤU TRÚC DỮ LIỆU MỚI ===
    baseExpenses: baseAnnualLivingExpenses, // Chi tiêu cơ bản (không bảo hiểm)
    preInsuranceExpenses: baseAnnualExpenses, // Chi tiêu trước bảo hiểm
    insurancePremium: finalInsurancePremium, // Phí bảo hiểm cuối cùng
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
    cumulativeSavingsFromMonthly: cumulativeSavingsFromMonthlyN0,
  };

  year0.loanAmountNeeded = Math.max(0, year0.housePriceProjected - year0.cumulativeSavings);
  year0.ltvRatio = year0.housePriceProjected > 0 ? (year0.loanAmountNeeded / year0.housePriceProjected) * 100 : 0;
  year0.monthlyPayment = calculateMonthlyPayment(year0.loanAmountNeeded, plan.loanInterestRate, plan.loanTermYears, paymentMethod);
  year0.buffer = year0.monthlySurplus - year0.monthlyPayment;
  year0.isAffordable = year0.buffer >= 0;

  projectionData.push(year0);

  let accumulatedFromInitial = year0.cumulativeSavingsFromInitial;
  let accumulatedFromMonthly = year0.cumulativeSavingsFromMonthly;

  for (let n = 1; n <= maxYears; n++) {
    const prev = projectionData[n - 1];

    const userAnnualIncome = prev.primaryIncome * (1 + plan.pctSalaryGrowth / 100);
    const coApplicantAnnualIncome = prev.spouseIncome * (1 + (plan.coApplicantSalaryGrowth ?? plan.pctSalaryGrowth) / 100);
    const otherAnnualIncome = prev.otherIncome;
    const totalAnnualIncome = userAnnualIncome + coApplicantAnnualIncome + otherAnnualIncome;

    // === LOGIC MỚI CHO CÁC NĂM TIẾP THEO ===
    const livingExpensesAnnual = prev.baseExpenses * (1 + plan.pctExpenseGrowth / 100);
    const nonHousingDebtAnnual = (plan.monthlyNonHousingDebt || 0) * 12;
    const baseAnnualExpensesCurrent = livingExpensesAnnual + nonHousingDebtAnnual;

    // Bảo hiểm sẽ được xử lý trong PlaygroundPageClient
    const insuranceAnnual = plan.currentAnnualInsurancePremium || 0;

    const totalAnnualExpenses = baseAnnualExpensesCurrent + insuranceAnnual;

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
    accumulatedFromInitial *= Math.pow(1 + monthlyRate, createMonth - 1);

    const fvOfCurrentYearMonthlySavings = (monthlyRate > 0)
      ? monthlyNewSavings * (Math.pow(1 + monthlyRate, createMonth - 1) - 1) / monthlyRate
      : monthlyNewSavings * (createMonth - 1);

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
      cumulativeSavings,
      loanAmountNeeded: bankLoanNeeded,
      monthlyPayment,
      monthlySurplus,
      buffer,
      isAffordable,
      loanTermYears: plan.loanTermYears,
      familyLoanRepayment: annualFamilyLoanRepayment,
      // === CẤU TRÚC DỮ LIỆU MỚI ===
      baseExpenses: livingExpensesAnnual,
      preInsuranceExpenses: baseAnnualExpensesCurrent,
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
