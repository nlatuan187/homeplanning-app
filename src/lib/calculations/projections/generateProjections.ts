import { Plan } from "@prisma/client";
import { ProjectionRow } from "../affordability";

// Calculate monthly mortgage payment
function calculateMonthlyPayment(
  loanAmount: number, 
  annualInterestRate: number, 
  termMonths: number, 
  paymentMethod: "fixed" | "decreasing" = "fixed"
): number {
  // Handle edge case: If loanAmount <= 0, return 0
  if (loanAmount <= 0) return 0;

  // Calculate monthly interest rate
  const monthlyRate = annualInterestRate / 12 / 100;

  // Handle edge case: If monthlyRate == 0, return loanAmount / termMonths
  if (monthlyRate === 0) return loanAmount / termMonths;

  if (paymentMethod === "fixed") {
    // Calculate fixed monthly payment using the formula: M = P * [ i * (1 + i)^n ] / [ (1 + i)^n – 1]
    return (
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1)
    );
  } else {
    // For decreasing payment method, calculate the first month's payment
    // Principal component is fixed: loanAmount / termMonths
    const monthlyPrincipal = loanAmount / termMonths;
    // Interest component for the first month: loanAmount * monthlyRate
    const firstMonthInterest = loanAmount * monthlyRate;
    // First month's payment is the highest
    return monthlyPrincipal + firstMonthInterest;
  }
}

/**
 * Generates financial projections for a given plan
 * This is the core calculation that creates the ProjectionDataTable
 */
export function generateProjections(plan: Plan, maxProjectionYear?: number): ProjectionRow[] {
  // Current year
  const currentYear = new Date().getFullYear();

  // Target purchase year
  const targetPurchaseYear = currentYear + plan.yearsToPurchase;

  // Maximum projection year (5 years beyond target)
  const maxYears = maxProjectionYear || (plan.yearsToPurchase + 5);

  // Initialize projection data
  const projectionData: ProjectionRow[] = [];

  // Year 0 (current year) initialization
  const initialEF = (plan.monthlyLivingExpenses + plan.monthlyNonHousingDebt) * 6; // 6 months of expenses
  const baseExpenseN0 = (plan.monthlyLivingExpenses + plan.monthlyNonHousingDebt) * 12;

  // Marriage and child factors
  const isMarriedInitially = plan.maritalStatus === "Đã kết hôn/Sống chung";
  const factorMarriage = isMarriedInitially ? plan.factorMarriage : 0;
  const factorChild = plan.hasDependents ? (plan.factorChild * (plan.numberOfDependents || 0)) : 0;

  // Calculate spouse income - FIXED: Use 50% of primary income as default
  let spouseIncomeAbsolute = 0;
  if (isMarriedInitially) {
    spouseIncomeAbsolute = plan.spouseMonthlyIncome && plan.spouseMonthlyIncome > 0
      ? plan.spouseMonthlyIncome * 12
      : plan.incomeLastYear * 0.50; // Default to 50% of primary income
  }

  // Year 0 calculations
  const year0: ProjectionRow = {
    year: currentYear,
    n: 0,
    housePriceProjected: plan.targetHousePriceN0,
    primaryIncome: plan.incomeLastYear,
    otherIncome: plan.monthlyOtherIncome * 12,
    spouseIncome: spouseIncomeAbsolute,
    annualIncome: plan.incomeLastYear + spouseIncomeAbsolute + (plan.monthlyOtherIncome * 12),
    baseExpenses: baseExpenseN0,
    preInsuranceExpenses: baseExpenseN0 * (1 + (factorMarriage / 100) + (factorChild / 100)),
    // insurancePremium will store the *additional* premium needed to reach 12.5% target
    insurancePremium: 0, // Calculated below
    annualExpenses: 0, // Will be calculated below
    annualSavings: 0, // Will be calculated below
    targetEF: initialEF,
    efTopUp: 0, // No top-up in initial year
    cumulativeSavings: plan.initialSavingsGoal - initialEF,
    loanAmountNeeded: 0, // Will be calculated below
    ltvRatio: 0, // Will be calculated below
    monthlyPayment: 0, // Will be calculated below
    monthlySurplus: 0, // Will be calculated below
    buffer: 0, // Will be calculated below
    isAffordable: false, // Will be calculated below
    pctHouseGrowth: plan.pctHouseGrowth,
    pctSalaryGrowth: plan.pctSalaryGrowth,
    pctExpenseGrowth: plan.pctExpenseGrowth,
    pctInvestmentReturn: plan.pctInvestmentReturn,
    factorMarriage: factorMarriage,
    factorChild: factorChild
  };

  // Complete year 0 calculations
  const actualInsurancePaidN0 = plan.currentAnnualInsurancePremium || 0;
  const targetInsuranceN0 = 0.125 * year0.preInsuranceExpenses;
  year0.insurancePremium = Math.max(0, targetInsuranceN0 - actualInsurancePaidN0); // Additional premium needed
  year0.annualExpenses = year0.preInsuranceExpenses + actualInsurancePaidN0; // Total expenses include actual paid insurance

  year0.annualSavings = year0.annualIncome - year0.annualExpenses;
  year0.loanAmountNeeded = Math.max(0, year0.housePriceProjected - year0.cumulativeSavings);
  year0.ltvRatio = year0.housePriceProjected > 0 ? (year0.loanAmountNeeded / year0.housePriceProjected) * 100 : 0;
  // Get payment method from plan or default to "fixed"
  const paymentMethod = (plan as any).paymentMethod === "decreasing" ? "decreasing" : "fixed";
  
  year0.monthlyPayment = calculateMonthlyPayment(
    year0.loanAmountNeeded, 
    plan.loanInterestRate, 
    plan.loanTermMonths,
    paymentMethod
  );
  year0.monthlySurplus = year0.annualSavings / 12;
  year0.buffer = year0.monthlySurplus - year0.monthlyPayment;
  
  // FIXED: Buffer must be positive for affordability
  year0.isAffordable = year0.buffer >= 0;

  // Add year 0 to projection data
  projectionData.push(year0);

  // Projection loop for years 1 to maxProjectionYear
  for (let n = 1; n <= maxYears; n++) {
    const prevYear = projectionData[n - 1];
    const currentCalendarYear = currentYear + n;

    // Check if marriage happens this year
    let currentFactorMarriage = prevYear.factorMarriage;
    if (currentFactorMarriage === 0 && plan.plansMarriageBeforeTarget && plan.targetMarriageYear === currentCalendarYear) {
      currentFactorMarriage = plan.factorMarriage;
    }

    // Check if child is born this year
    let currentFactorChild = prevYear.factorChild;
    if (plan.plansChildBeforeTarget && plan.targetChildYear === currentCalendarYear) {
      currentFactorChild += plan.factorChild; // Add one child's factor
    }

    // Calculate projected values
    const housePriceProjected = prevYear.housePriceProjected * (1 + (plan.pctHouseGrowth / 100));
    const primaryIncome = prevYear.primaryIncome * (1 + (plan.pctSalaryGrowth / 100));

    // FIXED: Spouse income calculation
    // If spouse income exists, grow it at salary growth rate
    // If spouse income doesn't exist but marriage factor is present, use 50% of primary income
    const spouseIncome = prevYear.spouseIncome > 0
      ? prevYear.spouseIncome * (1 + (plan.pctSalaryGrowth / 100))
      : (currentFactorMarriage > 0 ? primaryIncome * 0.50 : 0); // Use 50% factor, not expense factor

    // Other income remains constant
    const otherIncome = prevYear.otherIncome;

    // Total income
    const annualIncome = primaryIncome + spouseIncome + otherIncome;

    // Expenses grow with the expense growth rate
    const baseExpenses = prevYear.baseExpenses * (1 + (plan.pctExpenseGrowth / 100));

    // FIXED: Use marriage/child factors only for expenses
    const preInsuranceExpenses = baseExpenses * (1 + (currentFactorMarriage / 100) + (currentFactorChild / 100));
    
    const actualInsurancePaidN = plan.currentAnnualInsurancePremium || 0; // Assuming insurance premium input is an annual figure and doesn't grow with inflation for simplicity, unless specified otherwise
    const targetInsuranceN = 0.125 * preInsuranceExpenses;
    const insurancePremium = Math.max(0, targetInsuranceN - actualInsurancePaidN); // Additional premium needed for this year
    const annualExpenses = preInsuranceExpenses + actualInsurancePaidN; // Total expenses include actual paid insurance

    // Target emergency fund based on current expenses (pre-insurance, as EF is for living costs)
    const targetEF = (preInsuranceExpenses / 12) * 6; 
    const efTopUp = Math.max(0, targetEF - initialEF);

    // Annual savings
    const annualSavings = annualIncome - annualExpenses;

    // Cumulative savings with investment returns
    const cumulativeSavings = (prevYear.cumulativeSavings * (1 + (plan.pctInvestmentReturn / 100))) +
                              annualSavings - efTopUp;

    // Loan amount needed
    const loanAmountNeeded = Math.max(0, housePriceProjected - cumulativeSavings);

    // LTV ratio
    const ltvRatio = housePriceProjected > 0 ? (loanAmountNeeded / housePriceProjected) * 100 : 0;

    // Monthly payment
    const monthlyPayment = calculateMonthlyPayment(
      loanAmountNeeded, 
      plan.loanInterestRate, 
      plan.loanTermMonths,
      paymentMethod
    );

    // Monthly surplus
    const monthlySurplus = annualSavings / 12;

    // Buffer
    const buffer = monthlySurplus - monthlyPayment;

    // FIXED: Buffer must be positive for affordability
    const isAffordable = buffer >= 0;

    console.log(`Year ${currentCalendarYear}:`);
    console.log(`  pctExpenseGrowth: ${plan.pctExpenseGrowth}`);
    console.log(`  baseExpenses: ${baseExpenses}`);
    console.log(`  preInsuranceExpenses: ${preInsuranceExpenses}`);
    console.log(`  targetEF: ${targetEF}`);

    // Create year data
    const yearData: ProjectionRow = {
      year: currentCalendarYear,
      n,
      housePriceProjected,
      primaryIncome,
      otherIncome,
      spouseIncome,
      annualIncome,
      baseExpenses,
      preInsuranceExpenses,
      insurancePremium,
      annualExpenses,
      annualSavings,
      targetEF,
      efTopUp,
      cumulativeSavings,
      loanAmountNeeded,
      ltvRatio,
      monthlyPayment,
      monthlySurplus,
      buffer,
      isAffordable,
      pctHouseGrowth: plan.pctHouseGrowth,
      pctSalaryGrowth: plan.pctSalaryGrowth,
      pctExpenseGrowth: plan.pctExpenseGrowth,
      pctInvestmentReturn: plan.pctInvestmentReturn,
      factorMarriage: currentFactorMarriage,
      factorChild: currentFactorChild
    };

    // Add to projection data
    projectionData.push(yearData);
  }

  return projectionData;
}
