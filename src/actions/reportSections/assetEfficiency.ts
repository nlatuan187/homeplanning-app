import { ProjectionRow } from "@/lib/calculations/affordability";
import { Plan as PrismaPlan } from "@prisma/client";

// Assuming UserContext is defined elsewhere (e.g. generateFinalReport.ts or a shared types file)
// For now, defining the part of UserContext that this function uses:
interface UserContextForAssetEfficiency {
  confirmedPurchaseYear: number;
  pctInvestmentReturn: number;
  pctHouseGrowth: number;
}

interface DonutChartItem {
  name: string;
  value: number;
}

interface AnnotationItem {
  text: string;
  description: string;
}

interface SavingsProjectionItem {
  year: number;
  cumulativeSavings: number;
  investmentRate: number;
}

export interface AssetEfficiencyReportData {
  plan: PrismaPlan;
  projectionData: ProjectionRow[];
  currentSituation: {
    donutChart: DonutChartItem[];
    totalSavings: number;
    emergencyFund: number;
    currentSavings: number;
    annotations: AnnotationItem[];
  };
  goalProposal: {
    targetYear: number;
    yearsToPurchase: number;
    targetSavings: number;
    targetPercentage: number;
    currentSavings: number;
    investmentRate: number;
    current: {
      year: number;
      housePrice: number;
      savings: number;
      percentage: number;
    };
    target: {
      year: number;
      housePrice: number;
      savings: number;
      percentage: number;
    };
  };
  recommendations: {
    investmentRate: number;
    houseGrowthRate: number;
    reasoning: string; // General reasoning
    savingsProjections: SavingsProjectionItem[];
  };
  // Add fields for specific explanations used by the UI
  salaryGrowthExplanation?: string;
  investmentReturnExplanation?: string;
}

interface AssetEfficiencyError {
  error: true;
  message: string;
  details: string;
}

/**
 * Generate the Asset Efficiency section of the report
 */
export async function generateAssetEfficiencySection(
  plan: PrismaPlan,
  confirmedYearData: ProjectionRow,
  userContext: UserContextForAssetEfficiency,
  projectionData: ProjectionRow[]
): Promise<AssetEfficiencyReportData | AssetEfficiencyError> {
  try {
    // --- Calculations ---

    // Emergency Fund calculation based on initial monthly expenses
    const initialMonthlyExpenses = plan.monthlyLivingExpenses + (plan.monthlyNonHousingDebt || 0);
    const emergencyFund = Math.round(initialMonthlyExpenses * 6);

    // Current savings for the house is the initial savings minus the calculated emergency fund.
    // Ensure it doesn't go below zero.
    const currentHouseSavings = Math.max(0, Math.round(plan.initialSavings - emergencyFund));
    const totalInitialSavings = Math.round(plan.initialSavings);
    
    // Target savings and house price at the confirmed purchase year
    const targetSavings = Math.round(confirmedYearData.cumulativeSavings);
    const targetHousePrice = Math.round(confirmedYearData.housePriceProjected);
    
    // Percentages
    const currentPercentage = targetHousePrice > 0 ? Math.round((totalInitialSavings / targetHousePrice) * 100) : 0;
    const targetPercentage = targetHousePrice > 0 ? Math.round((targetSavings / targetHousePrice) * 100) : 0;
    
    // Year-related values
    const currentYear = new Date().getFullYear();
    const confirmedYear = userContext.confirmedPurchaseYear;
    const yearsToPurchase = confirmedYear - currentYear;
    
    // Create projection data for the savings growth chart
    const relevantProjections = projectionData.filter(p => 
      p.year >= currentYear && p.year <= confirmedYear
    );
    
    const savingsProjections = relevantProjections.map((projection, index) => ({
        year: projection.year,
        cumulativeSavings: Math.round(projection.cumulativeSavings),
        investmentRate: index === 0 ? 0 : userContext.pctInvestmentReturn
    }));
    
    // --- Data Structuring for UI ---

    return {
      plan: plan,
      projectionData: projectionData,
      // Section 1: Current Situation
      currentSituation: {
        donutChart: [
          { name: 'Quỹ dự phòng', value: emergencyFund },
          { name: 'Tiết kiệm Mua nhà', value: currentHouseSavings }
        ],
        totalSavings: totalInitialSavings,
        emergencyFund: emergencyFund,
        currentSavings: currentHouseSavings,
        annotations: [
          {
            text: `${emergencyFund.toLocaleString()} triệu`,
            description: "số tiền dành cho quỹ dự phòng (tương đương 6 tháng chi tiêu của bạn)"
          },
          {
            text: `${currentHouseSavings.toLocaleString()} triệu`,
            description: "số tiền bạn đã có, dùng tích lũy để mua nhà"
          },
          {
            text: `${totalInitialSavings.toLocaleString()} triệu`,
            description: "tổng số tiền tiết kiệm bạn đang có"
          }
        ]
      },
      
      // Section 2: Goal Proposal
      goalProposal: {
        targetYear: confirmedYear,
        yearsToPurchase: yearsToPurchase,
        targetSavings: targetSavings,
        targetPercentage: targetPercentage,
        currentSavings: totalInitialSavings,
        investmentRate: userContext.pctInvestmentReturn,
        
        current: {
          year: currentYear,
          housePrice: targetHousePrice,
          savings: totalInitialSavings,
          percentage: currentPercentage
        },
        
        target: {
          year: confirmedYear,
          housePrice: targetHousePrice,
          savings: targetSavings,
          percentage: targetPercentage
        }
      },
      
      // Section 3: Recommendations
      recommendations: {
        investmentRate: userContext.pctInvestmentReturn,
        houseGrowthRate: userContext.pctHouseGrowth,
        reasoning: `Giá nhà tăng ${userContext.pctHouseGrowth}%/năm. Để đuổi kịp, tỷ suất đầu tư của bạn cần tăng cao hơn tốc độ tăng giá nhà. Đó là lý do tại sao bạn cần tăng tỷ suất đầu tư lên ${userContext.pctInvestmentReturn}%.`,
        savingsProjections: savingsProjections
      },
      salaryGrowthExplanation: "Tiền lương là khoản thu đóng góp rất lớn vào tích lũy hàng năm, vì vậy cần tăng trưởng lương để giúp sở hữu căn nhà đầu tiên sớm hơn. Con số 7% được tính toán dựa trên mức tăng lương trung bình của người lao động.",
      investmentReturnExplanation: "Tốc độ tăng giá nhà trung bình là 10%/năm, vì vậy bạn cần đầu tư với tỷ suất sinh lời cao hơn tốc độ tăng giá, ít nhất là 11%/năm."
    };
  } catch (error) {
    console.error(`Error generating Asset Efficiency section:`, error);
    return {
      error: true,
      message: `Chúng tôi gặp sự cố khi tạo phần này. Vui lòng làm mới trang để thử lại.`,
      details: error instanceof Error ? error.message : 'Lỗi không xác định'
    };
  }
}
