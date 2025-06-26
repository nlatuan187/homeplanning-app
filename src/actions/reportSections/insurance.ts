// import { ProjectionRow } from "@/lib/calculations/affordability"; // Not directly needed if calculations use 'plan'
// import { calculateLoanSummary } from "@/lib/calculations/projections/calculateLoanSummary"; // Not needed
import { Plan as PrismaPlan } from "@prisma/client";

interface ExpertExplanation {
  q: string;
  a: string;
}

export interface InsuranceReportData {
  plan: PrismaPlan;
  currentInsuranceAmount: number;
  recommendedInsuranceAmount: number;
  coveragePercentage: number; // Value between 0 and 1
  gaugeValue: number; // coveragePercentage * 100
  expertExplanations: ExpertExplanation[];
  // Add any other static or derived texts the UI component needs from here
}

interface InsuranceError {
  error: true;
  message: string;
  details: string;
}

/**
 * Generate the Insurance section of the report (Non-AI version)
 */
export async function generateInsuranceSection(
  plan: PrismaPlan,
  // confirmedYearData: ProjectionRow, // Not strictly needed if using plan fields directly
  // userContext: any, // Not needed for non-AI
  // loanSummary: ReturnType<typeof calculateLoanSummary>, // Not needed
  // projectionData: ProjectionRow[] // Not needed
): Promise<InsuranceReportData | InsuranceError> {
  try {
    // Calculation based on UI component logic: 12.5% of annual living expenses + non-housing debt
    const annualLivingExpenses = plan.monthlyLivingExpenses * 12;
    const annualNonHousingDebt = (plan.monthlyNonHousingDebt || 0) * 12;
    const recommendedInsuranceAmount = Math.round((annualLivingExpenses + annualNonHousingDebt) * 0.125);
    
    const currentInsuranceAmount = plan.currentAnnualInsurancePremium || 0;
    
    let coveragePercentage = 0;
    if (recommendedInsuranceAmount > 0) {
      coveragePercentage = Math.min(1, currentInsuranceAmount / recommendedInsuranceAmount);
    }
    const gaugeValue = coveragePercentage * 100;

    const expertExplanations: ExpertExplanation[] = [
      {
        q: "Bảo hiểm cần gì cho việc mua nhà?",
        a: "Ngôi nhà chưa chắc là nhà của bạn khi chưa có bảo hiểm:\n- Nếu bạn có vấn đề về y tế (hàng trăm đến hàng tỷ đồng), điều bạn làm:\n  - Bán nhà đi với giá không tốt\n  - Đổ ăn tiêu\n  - Không đủ tiền để mua lại căn nhà mơ ước"
      },
      {
        q: "Tôi ghét bảo hiểm lắm!",
        a: "Bảo hiểm rất cần thiết, nhưng mua ĐÚNG và ĐỦ mới thực sự quan trọng. Nhiều trường hợp mua sai, đến khi cần lại không được chi trả, thậm chí phải bán nhà để lo liệu."
      },
      {
        q: "Mua bảo hiểm thế nào là ĐÚNG?",
        a: "Mua bảo hiểm ĐÚNG nghĩa là chọn đúng loại bảo hiểm cần thiết để bảo vệ khỏi những rủi ro lớn nhất có thể xảy ra — như tử vong, tai nạn nghiêm trọng, bệnh hiểm nghèo. Bên cạnh đó, cũng cần lựa chọn đúng tư vấn viên có tâm, đúng công ty hoặc đại lý bảo hiểm uy tín."
      },
      {
        q: "Mua bảo hiểm thế nào là ĐỦ?",
        a: "Mua bảo hiểm ĐỦ nghĩa là chọn mức bảo hiểm đủ lớn để người thân có thể tiếp tục cuộc sống ổn định nếu bạn mất thu nhập hoàn toàn. Số tiền bảo hiểm nên tương đương 10 năm chi tiêu của gia đình bạn (với điều kiện mức chi của gia đình bạn không thay đổi nhiều so với con số hiện tại). Để đảm bảo ĐỦ, số tiền tham gia hàng năm cần tương đương 5% thu nhập hàng năm của gia đình."
      }
    ];
        
    return {
      plan: plan,
      currentInsuranceAmount,
      recommendedInsuranceAmount,
      coveragePercentage,
      gaugeValue,
      expertExplanations,
    };
  } catch (error) {
    console.error(`Error generating Insurance section:`, error);
    return {
      error: true,
      message: `Chúng tôi gặp sự cố khi tạo phần này. Vui lòng làm mới trang để thử lại.`,
      details: error instanceof Error ? error.message : 'Lỗi không xác định'
    };
  }
}
