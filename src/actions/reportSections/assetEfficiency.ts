import { ProjectionRow } from "@/lib/calculations/affordability";
// import { calculateLoanSummary } from "@/lib/calculations/projections/calculateLoanSummary"; // loanSummary is passed but not used
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
  userContext: UserContextForAssetEfficiency, // Use specific part of UserContext
  // loanSummary: ReturnType<typeof calculateLoanSummary>, // Not used in this function
  projectionData: ProjectionRow[]
): Promise<AssetEfficiencyReportData | AssetEfficiencyError> {
  try {
    // Calculate values for the donut chart based on actual data
    const emergencyFund = Math.round(confirmedYearData.targetEF);
    const currentSavings = Math.round(plan.initialSavingsGoal - emergencyFund);
    const totalSavings = Math.round(plan.initialSavingsGoal);
    
    // Calculate target savings and percentages
    const targetSavings = Math.round(confirmedYearData.cumulativeSavings);
    const targetHousePrice = Math.round(confirmedYearData.housePriceProjected);
    const currentPercentage = Math.round((totalSavings / targetHousePrice) * 100);
    const targetPercentage = Math.round((targetSavings / targetHousePrice) * 100);
    
    // Current year and confirmed year
    const currentYear = new Date().getFullYear();
    const confirmedYear = userContext.confirmedPurchaseYear;
    const yearsToPurchase = confirmedYear - currentYear;
    
    // Create projection data for savings growth
    const relevantProjections = projectionData.filter(p => 
      p.year >= currentYear && p.year <= confirmedYear
    );
    
    const savingsProjections = relevantProjections.map((projection, index) => {
      return {
        year: projection.year,
        cumulativeSavings: Math.round(projection.cumulativeSavings),
        investmentRate: index === 0 ? 0 : userContext.pctInvestmentReturn
      };
    });
    
    // Return structured data for UI rendering
    return {
      // Section 1: Current Situation
      currentSituation: {
        donutChart: [
          { name: 'Quỹ dự phòng', value: emergencyFund },
          { name: 'Tiết kiệm Mua nhà', value: currentSavings }
        ],
        totalSavings: totalSavings,
        emergencyFund: emergencyFund,
        currentSavings: currentSavings,
        annotations: [
          {
            text: `${emergencyFund} triệu`,
            description: plan.hasDependents || plan.plansChildBeforeTarget 
              ? "số tiền sẽ dùng để thành quỹ dự phòng để chuẩn bị cho kế hoạch sinh em bé của bạn"
              : "số tiền dành cho quỹ dự phòng (tương đương 6 tháng chi tiêu)"
          },
          {
            text: `${currentSavings} triệu`,
            description: "số tiền bạn đã có, dùng tích lũy để mua nhà"
          },
          {
            text: `${totalSavings} triệu`,
            description: "số tiền tiết kiệm bạn đang có"
          }
        ]
      },
      
      // Section 2: Goal Proposal
      goalProposal: {
        targetYear: confirmedYear,
        yearsToPurchase: yearsToPurchase,
        targetSavings: targetSavings,
        targetPercentage: targetPercentage,
        currentSavings: totalSavings,
        investmentRate: userContext.pctInvestmentReturn,
        
        // Current situation box
        current: {
          year: currentYear,
          housePrice: targetHousePrice,
          savings: totalSavings,
          percentage: currentPercentage
        },
        
        // Target situation box
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
      // Populate static explanations, matching current UI fallbacks
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
