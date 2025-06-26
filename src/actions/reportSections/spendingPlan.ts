import { ProjectionRow } from "@/lib/calculations/affordability";
import { Plan as PrismaPlan } from "@prisma/client";

// Define the interfaces for the report data structure
export interface IncomeProjectionItem {
  year: number;
  totalIncome: number;
  personalIncome: number;
  spouseIncome: number;
  otherIncome: number;
}

export interface ExpenseProjectionItem {
  year: number;
  totalExpense: number;
  growthPct: number;
}

export interface SpendingRatioProjectionItem {
  year: number;
  totalIncome: number;
  totalExpense: number;
  spendingRatio: number;
}

export interface SpendingPlanReportData {
  plan: PrismaPlan;
  projectionData: ProjectionRow[];
  currentSituation: {
    income: {
      monthlyIncome: number;
      annualIncome: number;
      growthRate: number;
      hasCoApplicant: boolean;
      projections: IncomeProjectionItem[];
    };
    expenses: {
      monthlyExpenses: number;
      annualExpenses: number;
      growthRate: number;
      projections: ExpenseProjectionItem[];
    };
    monthlySurplus: number;
    mortgageToIncomeRatio: number;
  };
  expertExplanation: {
      expenseGrowthRate: number;
      salaryGrowthRate: number;
    expenseGrowthExplanation?: string;
  };
  recommendations: {
    spendingRatio: {
      confirmedYearRatio: number;
      mortgageRatio: number;
      projections: SpendingRatioProjectionItem[];
    };
  };
}

export interface SpendingPlanError {
  error: true;
  message: string;
  details: string;
}

/**
 * Generate the Spending Plan section of the report (UPDATED & REWRITTEN)
 */
export async function generateSpendingPlanSection(
  plan: PrismaPlan,
  confirmedYearData: ProjectionRow,
  projectionData: ProjectionRow[]
): Promise<SpendingPlanReportData | SpendingPlanError> {
  try {
    // const { loanTermYears } = plan; // Removed as it's not used in this function
    const monthlyIncomeConfirmedYear = confirmedYearData.annualIncome / 12;
    const mortgageToIncomeRatio = monthlyIncomeConfirmedYear > 0 
      ? (confirmedYearData.monthlyPayment / monthlyIncomeConfirmedYear) * 100 
      : 0;
    
    // Filter projections up to the confirmed year for the report charts
    const relevantProjections = projectionData.filter(p => p.year <= plan.confirmedPurchaseYear!);

    const incomeProjections = relevantProjections.map(p => ({
      year: p.year,
      totalIncome: Math.round(p.annualIncome),
      personalIncome: Math.round(p.primaryIncome),
      spouseIncome: Math.round(p.spouseIncome),
      otherIncome: Math.round(p.otherIncome),
    }));
    
    const expenseProjections = relevantProjections.map((p, index) => ({
      year: p.year,
      totalExpense: Math.round(p.annualExpenses),
      growthPct: index === 0 ? 0 : plan.pctExpenseGrowth,
    }));
    
    const spendingRatioProjections = relevantProjections.map(p => ({
      year: p.year,
      totalIncome: Math.round(p.annualIncome),
      totalExpense: Math.round(p.annualExpenses),
      spendingRatio: p.annualIncome > 0 ? Math.round((p.annualExpenses / p.annualIncome) * 100) : 0,
    }));
    
    const confirmedYearSpendingRatio = spendingRatioProjections.find(p => p.year === plan.confirmedPurchaseYear)?.spendingRatio ?? 0;

    return {
      plan: plan,
      projectionData: projectionData,
      currentSituation: {
        income: {
          monthlyIncome: Math.round(confirmedYearData.annualIncome / 12),
          annualIncome: Math.round(confirmedYearData.annualIncome),
          growthRate: plan.pctSalaryGrowth,
          hasCoApplicant: plan.hasCoApplicant,
          projections: incomeProjections,
        },
        expenses: {
          monthlyExpenses: Math.round(confirmedYearData.annualExpenses / 12),
          annualExpenses: Math.round(confirmedYearData.annualExpenses),
          growthRate: plan.pctExpenseGrowth,
          projections: expenseProjections,
        },
        monthlySurplus: Math.round(confirmedYearData.monthlySurplus),
        mortgageToIncomeRatio: Math.round(mortgageToIncomeRatio),
      },
      expertExplanation: {
          expenseGrowthRate: plan.pctExpenseGrowth,
        salaryGrowthRate: plan.pctSalaryGrowth,
        expenseGrowthExplanation: "Vì đây là mức gần bằng lạm phát của Việt Nam, giúp bạn giữ vững mức sống mà không tiêu hết phần thu nhập tăng thêm. Nhờ vậy, bạn vẫn còn dư để tiết kiệm và tích lũy cho mục tiêu mua nhà."
      },
      recommendations: {
        spendingRatio: {
          confirmedYearRatio: confirmedYearSpendingRatio,
          mortgageRatio: Math.round(mortgageToIncomeRatio),
          projections: spendingRatioProjections,
        }
      },
    };
  } catch (error) {
    console.error(`Error generating Spending Plan section:`, error);
    return {
      error: true,
      message: `Chúng tôi gặp sự cố khi tạo phần Kế hoạch Chi tiêu.`,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
