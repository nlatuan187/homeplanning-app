import { Plan, PlanHistory } from "@prisma/client";
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
    coApplicantMonthlyIncome: number | null;
    monthlyOtherIncome: number | null;
    familySupportType: 'GIFT' | 'LOAN' | null;
    familySupportAmount: number | null;
    familyGiftTiming: 'NOW' | 'AT_PURCHASE' | null;
    familyLoanRepaymentType: 'LUMP_SUM' | 'MONTHLY' | null;
    familyLoanInterestRate: number | null;
    familyLoanTermYears: number | null;
  } | null;
  history?: PlanHistory | null;
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
    return (
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1)
    );
  } else {
    const monthlyPrincipal = loanAmount / termMonths;
    const firstMonthInterest = loanAmount * monthlyRate;
    return monthlyPrincipal + firstMonthInterest;
  }
}

/**
 * Chuẩn bị dữ liệu kế hoạch, cung cấp giá trị mặc định để đảm bảo an toàn kiểu dữ liệu.
 * @param partialPlanData - Dữ liệu kế hoạch chưa hoàn chỉnh từ người dùng.
 * @returns - Một object Plan hoàn chỉnh, sẵn sàng cho việc tính toán.
 */
function preparePlanForProjection(partialPlanData: Partial<PlanWithDetails>): PlanWithDetails {
  const defaults = {
    createdAt: new Date(),
    yearsToPurchase: 3,
    targetHousePriceN0: 0,
    userMonthlyIncome: 0,
    hasCoApplicant: false,
    coApplicantMonthlyIncome: 0,
    pctSalaryGrowth: 7.0,
    coApplicantSalaryGrowth: 7.0,
    monthlyOtherIncome: 0,
    monthlyLivingExpenses: 0,
    monthlyNonHousingDebt: 0,
    currentAnnualInsurancePremium: 0,
    initialSavings: 0,
    pctHouseGrowth: 10.0,
    pctExpenseGrowth: 4.0,
    pctInvestmentReturn: 9.0,
    loanInterestRate: 11.0,
    loanTermYears: 25,
    hasNewChild: false,
    yearToHaveChild: 0,
    monthlyChildExpenses: 0,
    paymentMethod: "fixed" as "fixed" | "decreasing",
  };
  
  // Gộp dữ liệu người dùng với giá trị mặc định để tạo ra một plan hoàn chỉnh
  return { ...defaults, ...partialPlanData } as PlanWithDetails;
}

/**
 * Generates financial projections based on a prepared Plan object.
 * This is the core calculation engine for the application.
 */
export function generateProjections(planData: Partial<PlanWithDetails>, maxYearsToProject?: number): ProjectionRow[] {
  // BƯỚC 1: Chuẩn bị dữ liệu đầu vào an toàn
  const plan = preparePlanForProjection(planData);

  // --- PHẦN KHỞI TẠO ---
  const familySupport = plan.familySupport;
  const currentYear = plan.createdAt.getFullYear();
  const currentMonth = plan.createdAt.getMonth();
  const maxYears = maxYearsToProject || (plan.yearsToPurchase + 5);
  const projectionData: ProjectionRow[] = [];

  // BƯỚC 2: XỬ LÝ HỖ TRỢ NHẬN NGAY (GIFT - NOW)
  let initialSavings = plan.initialSavings;
  if (familySupport?.familySupportType === 'GIFT' && familySupport.familyGiftTiming === 'NOW' && familySupport.familySupportAmount) {
    initialSavings += familySupport.familySupportAmount;
  }

  const annualReturnRate = plan.pctInvestmentReturn / 100;
  const monthlyRate = Math.pow(1 + annualReturnRate, 1 / 12) - 1;

  const userMonthlyIncomeN0 = plan.userMonthlyIncome;
  const coApplicantMonthlyIncomeN0 = plan.hasCoApplicant ? plan.familySupport?.coApplicantMonthlyIncome : 0;
  const totalMonthlyIncomeN0 = userMonthlyIncomeN0 + (coApplicantMonthlyIncomeN0 || 0) + (plan.familySupport?.monthlyOtherIncome || 0);
  const annualIncomeN0 = totalMonthlyIncomeN0 * 12;

  let monthlyExpensesN0 = plan.monthlyLivingExpenses + plan.monthlyNonHousingDebt + (plan.currentAnnualInsurancePremium / 12);
  if (plan.hasNewChild && plan.yearToHaveChild && plan.monthlyChildExpenses && plan.yearToHaveChild === currentYear) {
    monthlyExpensesN0 += plan.monthlyChildExpenses;
  }
  const annualExpensesN0 = monthlyExpensesN0 * 12;
  const annualSavingsN0 = annualIncomeN0 - annualExpensesN0;

  const cumulativeSavingsN0 = initialSavings + (annualSavingsN0 / 12);

  // --- TÍNH TOÁN CHO NĂM 0 ---
  const year0: ProjectionRow = {
    year: currentYear,
    n: 0,
    housePriceProjected: plan.targetHousePriceN0,
    primaryIncome: userMonthlyIncomeN0 * 12,
    spouseIncome: (coApplicantMonthlyIncomeN0 || 0) * 12,
    otherIncome: (plan.familySupport?.monthlyOtherIncome || 0) * 12,
    annualIncome: annualIncomeN0,
    annualExpenses: annualExpensesN0,
    annualSavings: annualSavingsN0,
    cumulativeSavings: cumulativeSavingsN0,
    loanAmountNeeded: Math.max(0, plan.targetHousePriceN0 - cumulativeSavingsN0),
    monthlyPayment: calculateMonthlyPayment(Math.max(0, plan.targetHousePriceN0 - cumulativeSavingsN0), plan.loanInterestRate || 11, plan.loanTermYears || 25, plan.paymentMethod),
    monthlySurplus: annualSavingsN0 / 12,
    buffer: (annualSavingsN0 / 12) - calculateMonthlyPayment(Math.max(0, plan.targetHousePriceN0 - cumulativeSavingsN0), plan.loanInterestRate || 11, plan.loanTermYears || 25, plan.paymentMethod),
    isAffordable: ((annualSavingsN0 / 12) - calculateMonthlyPayment(Math.max(0, plan.targetHousePriceN0 - cumulativeSavingsN0), plan.loanInterestRate || 11, plan.loanTermYears || 25, plan.paymentMethod)) >= 0,
    baseExpenses: plan.monthlyLivingExpenses * 12,
    preInsuranceExpenses: (plan.monthlyLivingExpenses + plan.monthlyNonHousingDebt) * 12,
    insurancePremium: plan.currentAnnualInsurancePremium,
    targetEF: monthlyExpensesN0 * 6,
    efTopUp: 0,
    ltvRatio: plan.targetHousePriceN0 > 0 ? (Math.max(0, plan.targetHousePriceN0 - cumulativeSavingsN0) / plan.targetHousePriceN0) * 100 : 0,
    pctHouseGrowth: plan.pctHouseGrowth,
    pctSalaryGrowth: plan.pctSalaryGrowth,
    pctExpenseGrowth: plan.pctExpenseGrowth,
    pctInvestmentReturn: plan.pctInvestmentReturn,
    factorMarriage: 0,
    factorChild: 0,
    loanTermYears: plan.loanTermYears || 25,
    cumulativeSavingsFromInitial: initialSavings,
    cumulativeSavingsFromMonthly: annualSavingsN0 / 12,
    familyLoanRepayment: 0,
    monthlyChildExpenses: plan.monthlyChildExpenses,
    hasNewChild: plan.hasNewChild,
    yearToHaveChild: plan.yearToHaveChild || 0,
  };
  projectionData.push(year0);

  // --- BẮT ĐẦU VÒNG LẶP TỪ NĂM 1 ---
  for (let n = 1; n <= maxYears; n++) {
    const prev = projectionData[n - 1];

    const userAnnualIncome = prev.primaryIncome * (1 + plan.pctSalaryGrowth / 100);
    const coApplicantAnnualIncome = prev.spouseIncome * (1 + (plan?.coApplicantSalaryGrowth || 0) / 100);
    const totalAnnualIncome = userAnnualIncome + coApplicantAnnualIncome + prev.otherIncome;

    const livingExpensesAnnual = prev.baseExpenses * (1 + plan.pctExpenseGrowth / 100);

    // Xử lý chi phí con cái cho các năm trong tương lai, bao gồm lạm phát chi phí
    const projectionYear = currentYear + n;
    let childExpensesAnnual = 0;
    if (plan.hasNewChild && plan.yearToHaveChild && plan.monthlyChildExpenses && projectionYear >= plan.yearToHaveChild) {
      const yearsSinceChildBorn = projectionYear - plan.yearToHaveChild;
      childExpensesAnnual = (plan.monthlyChildExpenses * 12) * Math.pow(1 + plan.pctExpenseGrowth / 100, yearsSinceChildBorn);
    }

    const totalAnnualExpenses = livingExpensesAnnual + (plan.monthlyNonHousingDebt * 12) + plan.currentAnnualInsurancePremium + childExpensesAnnual;

    let annualSavings = totalAnnualIncome - totalAnnualExpenses;
    
    // BƯỚC 3: XỬ LÝ TRẢ NỢ GIA ĐÌNH (LOAN - MONTHLY & LUMP_SUM)
    let annualFamilyLoanRepayment = 0;
    if (familySupport?.familySupportType === 'LOAN' && familySupport.familySupportAmount && familySupport.familyLoanTermYears) {
        if (familySupport.familyLoanRepaymentType === 'MONTHLY' && n >= plan.yearsToPurchase && n < plan.yearsToPurchase + familySupport.familyLoanTermYears) {
            annualFamilyLoanRepayment = familySupport.familySupportAmount / familySupport.familyLoanTermYears;
        }
        if (familySupport.familyLoanRepaymentType === 'LUMP_SUM' && n === plan.yearsToPurchase + familySupport.familyLoanTermYears) {
            annualFamilyLoanRepayment = familySupport.familySupportAmount;
        }
    }
    annualSavings -= annualFamilyLoanRepayment;
    
    let accumulatedFromMonthly = prev.cumulativeSavingsFromMonthly + prev.annualSavings / 12 * (Math.pow(1 + monthlyRate, 12 - currentMonth) - 1) / monthlyRate;
    let accumulatedFromInitial = prev.cumulativeSavingsFromInitial * Math.pow(1 + monthlyRate, 12 - currentMonth);
    const monthlyNewSavings = annualSavings / 12;
    accumulatedFromInitial *= Math.pow(1 + monthlyRate, currentMonth);
    const fvOfCurrentYearMonthlySavings = (monthlyRate > 0) ? monthlyNewSavings * (Math.pow(1 + monthlyRate, currentMonth) - 1) / monthlyRate : monthlyNewSavings * currentMonth;
    accumulatedFromMonthly *= Math.pow(1 + monthlyRate, currentMonth);
    accumulatedFromMonthly += fvOfCurrentYearMonthlySavings;
    const cumulativeSavings = accumulatedFromInitial + accumulatedFromMonthly;

    const housePriceProjected = prev.housePriceProjected * (1 + plan.pctHouseGrowth / 100);

    // BƯỚC 4: XỬ LÝ HỖ TRỢ TẠI NĂM MUA NHÀ
    let equityForPurchase = cumulativeSavings;
    if (n === plan.yearsToPurchase && familySupport?.familySupportAmount) {
        if (familySupport.familySupportType === 'GIFT' && familySupport.familyGiftTiming === 'AT_PURCHASE') {
            equityForPurchase += familySupport.familySupportAmount;
        }
        if (familySupport.familySupportType === 'LOAN') {
            equityForPurchase += familySupport.familySupportAmount;
        }
    }

    const bankLoanNeeded = Math.max(0, housePriceProjected - equityForPurchase);
    
    const monthlyPayment = calculateMonthlyPayment(bankLoanNeeded, plan.loanInterestRate || 11, plan.loanTermYears || 25, plan.paymentMethod);
    const monthlySurplus = annualSavings / 12;
    const buffer = monthlySurplus - monthlyPayment;
    const isAffordable = buffer >= 0;

    // Cập nhật lại Quỹ dự phòng mục tiêu để bao gồm các chi phí mới
    const monthlyExpensesForEF = (totalAnnualExpenses / 12);
    const targetEF = monthlyExpensesForEF * 6;

    projectionData.push({
      year: currentYear + n,
      n,
      housePriceProjected,
      primaryIncome: userAnnualIncome,
      spouseIncome: coApplicantAnnualIncome,
      otherIncome: prev.otherIncome,
      annualIncome: totalAnnualIncome,
      annualExpenses: totalAnnualExpenses,
      annualSavings,
      cumulativeSavings,
      loanAmountNeeded: bankLoanNeeded,
      monthlyPayment,
      monthlySurplus,
      buffer,
      isAffordable,
      loanTermYears: plan.loanTermYears || 25,
      familyLoanRepayment: annualFamilyLoanRepayment,
      baseExpenses: livingExpensesAnnual,
      preInsuranceExpenses: livingExpensesAnnual + (plan.monthlyNonHousingDebt * 12),
      insurancePremium: plan.currentAnnualInsurancePremium || 0,
      targetEF: targetEF,
      efTopUp: 0,
      ltvRatio: housePriceProjected > 0 ? (bankLoanNeeded / housePriceProjected) * 100 : 0,
      pctHouseGrowth: plan.pctHouseGrowth,
      pctSalaryGrowth: plan.pctSalaryGrowth,
      pctExpenseGrowth: plan.pctExpenseGrowth,
      pctInvestmentReturn: plan.pctInvestmentReturn,
      factorMarriage: 0,
      factorChild: 0,
      cumulativeSavingsFromInitial: accumulatedFromInitial,
      cumulativeSavingsFromMonthly: accumulatedFromMonthly,
      monthlyChildExpenses: plan.monthlyChildExpenses,
      hasNewChild: plan.hasNewChild,
      yearToHaveChild: plan.yearToHaveChild || 0,
    });
  }

  return projectionData;
}
