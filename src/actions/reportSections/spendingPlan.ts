import { ProjectionRow } from "@/lib/calculations/affordability";
import { type LoanSummary } from "@/lib/calculations/projections/calculateLoanSummary"; // Import only LoanSummary type
import { Plan as PrismaPlan } from "@prisma/client";

interface IncomeProjectionItem {
  year: number;
  totalIncome: number;
  personalIncome: number;
  spouseIncome: number;
  otherIncome: number;
}

interface ExpenseProjectionItem {
  year: number;
  totalExpense: number;
  growthPct: number;
}

interface SpendingRatioProjectionItem {
  year: number;
  totalIncome: number;
  totalExpense: number;
  spendingRatio: number;
}

export interface SpendingPlanReportData {
  currentSituation: {
    income: {
      monthlyIncome: number;
      annualIncome: number;
      growthRate: number;
      maritalStatus: string;
      hasSpouseIncome: boolean;
      projections: IncomeProjectionItem[];
    };
    expenses: {
      monthlyExpenses: number;
      annualExpenses: number;
      growthRate: number;
      hasDependents: boolean | null;
      factorMarriage: number;
      factorChild: number;
      projections: ExpenseProjectionItem[];
    };
    monthlySurplus: number;
    paymentToIncomeRatio: number;
    plansMarriageBeforeTarget: boolean | null;
    targetMarriageYear: number | null;
    plansChildBeforeTarget: boolean | null;
    targetChildYear: number | null;
  };
  expertExplanation: {
    expenseFactors: {
      factorMarriage: number;
      factorChild: number;
      expenseGrowthRate: number;
      salaryGrowthRate: number;
    };
    requiredSalaryGrowth: {
      rate: number;
      houseGrowthRate: number;
      investmentReturnRate: number;
    };
    expenseGrowthExplanation?: string; // Added field
  };
  recommendations: {
    spendingRatio: {
      current: number;
      confirmedYear: number;
      mortgageRatio: number;
      projections: SpendingRatioProjectionItem[];
    };
  };
}

interface SpendingPlanError {
  error: true;
  message: string;
  details: string;
}


/**
 * Generate the Spending Plan section of the report
 */
export async function generateSpendingPlanSection(
  plan: PrismaPlan,
  confirmedYearData: ProjectionRow,
  // userContext: any, // Not used
  loanSummary: LoanSummary, // Use imported LoanSummary type
  // projectionData: ProjectionRow[] // Not used
): Promise<SpendingPlanReportData | SpendingPlanError> {
  try {
    // Calculate monthly values
    const monthlyIncome = Math.round(confirmedYearData.annualIncome / 12);
    const monthlyExpenses = Math.round(confirmedYearData.annualExpenses / 12);
    const monthlySurplus = Math.round(confirmedYearData.monthlySurplus);
    const paymentToIncomeRatio = Math.round(loanSummary.paymentToIncomeRatio);
    
    // Years for projections
    const years = [2025, 2026, 2027];
    const growthRate = 1 + (plan.pctSalaryGrowth / 100);
    const expenseGrowthRate = 1 + (plan.pctExpenseGrowth / 100);
    
    // Base values for 2025
    const baseIncome = monthlyIncome * 12;
    const basePersonalIncome = baseIncome * 0.6; // Assuming 60% is personal income
    const baseSpouseIncome = baseIncome * 0.4;   // Assuming 40% is spouse income
    const baseOtherIncome = baseIncome * 0.3;    // Assuming 30% is other income
    const baseExpense = monthlyExpenses * 12;
    
    // Create income projections
    const incomeProjections = years.map((year, index) => {
      const yearGrowth = Math.pow(growthRate, index);
      return {
        year: year,
        totalIncome: Math.round(baseIncome * yearGrowth),
        personalIncome: Math.round(basePersonalIncome * yearGrowth),
        spouseIncome: Math.round(baseSpouseIncome * yearGrowth),
        otherIncome: Math.round(baseOtherIncome * yearGrowth)
      };
    });
    
    // Create expense projections
    const expenseProjections = years.map((year, index) => {
      const yearGrowth = Math.pow(expenseGrowthRate, index);
      return {
        year: year,
        totalExpense: Math.round(baseExpense * yearGrowth),
        growthPct: index === 0 ? 0 : Math.round((expenseGrowthRate - 1) * 100)
      };
    });
    
    // Create spending ratio projections
    const spendingRatioProjections = years.map((year, index) => {
      const incomeProjection = incomeProjections[index];
      const expenseProjection = expenseProjections[index];
      return {
        year: year,
        totalIncome: incomeProjection.totalIncome,
        totalExpense: expenseProjection.totalExpense,
        spendingRatio: Math.round((expenseProjection.totalExpense / incomeProjection.totalIncome) * 100)
      };
    });
    
    // Return structured data for UI rendering
    return {
      // Section 1: Current Situation
      currentSituation: {
        // Income summary
        income: {
          monthlyIncome: monthlyIncome,
          annualIncome: baseIncome,
          growthRate: plan.pctSalaryGrowth,
          maritalStatus: plan.maritalStatus,
          hasSpouseIncome: plan.maritalStatus === "Married" || plan.maritalStatus === "Partnered",
          projections: incomeProjections
        },
        
        // Expense summary
        expenses: {
          monthlyExpenses: monthlyExpenses,
          annualExpenses: baseExpense,
          growthRate: plan.pctExpenseGrowth,
          hasDependents: plan.hasDependents,
          factorMarriage: plan.factorMarriage || 30,
          factorChild: plan.factorChild || 40,
          projections: expenseProjections
        },
        
        // Additional data
        monthlySurplus: monthlySurplus,
        paymentToIncomeRatio: paymentToIncomeRatio,
        plansMarriageBeforeTarget: plan.plansMarriageBeforeTarget,
        targetMarriageYear: plan.targetMarriageYear,
        plansChildBeforeTarget: plan.plansChildBeforeTarget,
        targetChildYear: plan.targetChildYear
      },
      
      // Section 2: Expert Explanation
      expertExplanation: {
        expenseFactors: {
          factorMarriage: plan.factorMarriage || 30,
          factorChild: plan.factorChild || 40,
          expenseGrowthRate: plan.pctExpenseGrowth,
          salaryGrowthRate: plan.pctSalaryGrowth
        },
        requiredSalaryGrowth: {
          rate: plan.pctSalaryGrowth,
          houseGrowthRate: plan.pctHouseGrowth,
          investmentReturnRate: plan.pctInvestmentReturn
        },
        expenseGrowthExplanation: "Vì đây là mức gần bằng lạm phát của Việt Nam, giúp bạn giữ vững mức sống mà không tiêu hết phần thu nhập tăng thêm. Nhờ vậy, bạn vẫn còn dư để tiết kiệm và tích lũy cho mục tiêu mua nhà." // Added static text
      },
      
      // Section 3: Recommendations
      recommendations: {
        spendingRatio: {
          current: spendingRatioProjections[0].spendingRatio,
          confirmedYear: spendingRatioProjections[spendingRatioProjections.length - 1].spendingRatio,
          mortgageRatio: paymentToIncomeRatio,
          projections: spendingRatioProjections
        }
      }
    };
  } catch (error) {
    console.error(`Error generating Spending Plan section:`, error);
    return {
      error: true,
      message: `Chúng tôi gặp sự cố khi tạo phần này. Vui lòng làm mới trang để thử lại.`,
      details: error instanceof Error ? error.message : 'Lỗi không xác định'
    };
  }
}
