import { ProjectionRow } from "@/lib/calculations/affordability";
import { Plan as PrismaPlan } from "@prisma/client";

// Define types for Amortization Schedule
interface MonthlyAmortizationItem {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

interface YearlyAmortizationItem {
  year: number;
  totalPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  remainingBalance: number;
}

interface AmortizationSummary {
  totalPayment: number;
  totalInterest: number;
  monthlyPayment: number;
  lastMonthPayment?: number;
}

export interface AmortizationScheduleData {
  monthlySchedule: MonthlyAmortizationItem[];
  yearlySchedule: YearlyAmortizationItem[];
  summary: AmortizationSummary;
}

/**
 * Generate amortization schedule for a loan
 */
export function generateAmortizationSchedule(
  loanAmount: number,
  annualInterestRate: number,
  termMonths: number,
  paymentMethod: "fixed" | "decreasing" = "fixed"
): AmortizationScheduleData {
  // Handle edge cases
  if (loanAmount <= 0) {
    return {
      monthlySchedule: [],
      yearlySchedule: [],
      summary: {
        totalPayment: 0,
        totalInterest: 0,
        monthlyPayment: 0
      }
    };
  }

  // Calculate monthly interest rate
  const monthlyRate = annualInterestRate / 12 / 100;

  // Initialize variables
  let remainingBalance = loanAmount;
  const monthlySchedule = [];
  const yearlySchedule = [];
  
  let yearlyPayment = 0;
  let yearlyPrincipal = 0;
  let yearlyInterest = 0;
  let totalPayment = 0;
  let totalInterest = 0;
  let firstMonthPayment = 0;
  let lastMonthPayment = 0;

  // Fixed principal payment for decreasing method
  const fixedPrincipal = paymentMethod === "decreasing" ? loanAmount / termMonths : 0;

  // Calculate payment for each month
  for (let month = 1; month <= termMonths; month++) {
    let payment: number;
    let interest: number;
    let principal: number;

    if (paymentMethod === "fixed") {
      // Fixed payment method (standard amortization)
      if (monthlyRate === 0) {
        payment = loanAmount / termMonths;
        interest = 0;
        principal = payment;
      } else {
        payment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                 (Math.pow(1 + monthlyRate, termMonths) - 1);
        interest = remainingBalance * monthlyRate;
        principal = payment - interest;
      }
    } else {
      // Decreasing payment method
      principal = fixedPrincipal;
      interest = remainingBalance * monthlyRate;
      payment = principal + interest;
    }

    // Update remaining balance
    remainingBalance -= principal;
    
    // Ensure remaining balance doesn't go below zero due to rounding errors
    if (remainingBalance < 0) {
      principal += remainingBalance;
      payment = principal + interest;
      remainingBalance = 0;
    }

    // Store first and last month payment for summary
    if (month === 1) {
      firstMonthPayment = payment;
    }
    if (month === termMonths) {
      lastMonthPayment = payment;
    }

    // Add to monthly schedule
    monthlySchedule.push({
      month,
      payment,
      principal,
      interest,
      remainingBalance
    });

    // Update yearly totals
    yearlyPayment += payment;
    yearlyPrincipal += principal;
    yearlyInterest += interest;
    totalPayment += payment;
    totalInterest += interest;

    // If end of year or last month, add to yearly schedule
    if (month % 12 === 0 || month === termMonths) {
      const year = Math.ceil(month / 12);
      yearlySchedule.push({
        year,
        totalPayment: yearlyPayment,
        totalPrincipal: yearlyPrincipal,
        totalInterest: yearlyInterest,
        remainingBalance
      });

      // Reset yearly totals
      yearlyPayment = 0;
      yearlyPrincipal = 0;
      yearlyInterest = 0;
    }
  }

  // Create summary
  const summary = {
    totalPayment,
    totalInterest,
    monthlyPayment: firstMonthPayment,
    lastMonthPayment: paymentMethod === "decreasing" ? lastMonthPayment : undefined
  };

  return {
    monthlySchedule,
    yearlySchedule,
    summary
  };
}

// Define types for Capital Structure Report Data at the module level
interface DonutChartItemCS {
  name: string;
  value: number;
}
interface AnnotationItemCS {
  text: string;
  description: string;
}

export interface CapitalStructureReportData { // Export for use in generateFinalReport.ts
  currentSituation: {
    introText: string;
    donutChart: DonutChartItemCS[];
    housePrice: number;
    loanAmount: number;
    equityAmount: number;
    loanPercentage: number;
    equityPercentage: number;
    annotations: AnnotationItemCS[];
  };
  expertExplanation: {
    heading: string;
    intro: string;
    explanationPoints: string[];
    warning: string;
    reasoningForHouseGrowth?: string; // Added field
    reasoningForInterestRate?: string; // Added field
  };
  recommendations: {
    loanTerm: {
      years: number;
      months: number;
    };
    interestRate: number;
    note: string;
  };
  amortizationSchedule: AmortizationScheduleData;
  paymentMethod: "fixed" | "decreasing";
}

interface CapitalStructureError {
  error: true;
  message: string;
  details: string;
}

/**
 * Generate the Capital Structure section of the report
 */
export async function generateCapitalStructureSection(
  plan: PrismaPlan, // Use PrismaPlan type
  confirmedYearData: ProjectionRow,
  userContext: { // This is a subset of UserContext from generateFinalReport.ts
    confirmedPurchaseYear: number;
  }
): Promise<CapitalStructureReportData | CapitalStructureError> {
  try {
    // Calculate loan and equity values
    const housePrice = Math.round(confirmedYearData.housePriceProjected);
    const equityAmount = Math.round(confirmedYearData.cumulativeSavings);
    const loanAmount = Math.round(housePrice - equityAmount);
    const loanPercentage = Math.round((loanAmount / housePrice) * 100);
    const equityPercentage = 100 - loanPercentage;
    
    // Calculate loan term in years
    const loanTermYears = Math.round(plan.loanTermMonths / 12);
    
    // Current year and confirmed year
    const confirmedYear = userContext.confirmedPurchaseYear;
    const currentYear = new Date().getFullYear();
    const yearsToPurchase = confirmedYear - currentYear;
    
    // Create introduction text
    const introText = `Dựa trên mục tiêu và tình hình tài chính của bạn, chúng tôi khuyến nghị bạn mua nhà vào năm ${confirmedYear}, tức ${yearsToPurchase} năm nữa tính từ thời điểm hiện tại, và vay ${loanPercentage}% giá trị căn nhà.`;
    
    // Create explanation based on marital status and dependents
    const explanationPoints = [];
    
    // Add income explanation
    if (plan.maritalStatus === "Married" || plan.maritalStatus === "Partnered") {
      explanationPoints.push("Thu nhập hiện tại của hai vợ chồng, đã điều chỉnh tăng thu nhập mỗi năm (Xem thêm về thu nhập ở mục 4).");
    } else {
      explanationPoints.push("Thu nhập hiện tại của bạn, đã điều chỉnh tăng thu nhập mỗi năm (Xem thêm về thu nhập ở mục 4).");
    }
    
    // Add future plans explanation
    const futurePlans = [];
    // Handle nullable fields from PrismaPlan
    if (plan.plansMarriageBeforeTarget && (plan.targetMarriageYear ?? Infinity) <= confirmedYear) {
      futurePlans.push("kết hôn");
    }
    if (plan.plansChildBeforeTarget && (plan.targetChildYear ?? Infinity) <= confirmedYear) {
      futurePlans.push("có thêm thành viên mới");
    }
    
    if (futurePlans.length > 0) {
      explanationPoints.push(`Kế hoạch ${futurePlans.join(" và ")}, dẫn tới chi phí sẽ tăng theo (Xem thêm về chi phí ở mục 4).`);
    } else {
      explanationPoints.push("Kế hoạch ổn định, không có thay đổi lớn về chi phí (Xem thêm về chi phí ở mục 4).");
    }
    
    // Generate amortization schedule
    // Explicitly cast plan to a type that includes optional paymentMethod to satisfy TS
    const paymentMethodValue = (plan as { paymentMethod?: string | null }).paymentMethod;
    let effectivePaymentMethod: "fixed" | "decreasing" = "fixed"; // Default to fixed
    if (paymentMethodValue === "decreasing") {
      effectivePaymentMethod = "decreasing";
    }
    // If plan.paymentMethod is null, undefined, "fixed", or anything else, it defaults to "fixed"

    const amortizationSchedule = generateAmortizationSchedule(
      loanAmount,
      plan.loanInterestRate,
      plan.loanTermMonths,
      effectivePaymentMethod
    );
    
    // Return structured data for UI rendering
    return {
      // Section 1: Current Situation
      currentSituation: {
        introText: introText,
        donutChart: [
          { name: 'Vay', value: loanPercentage },
          { name: 'Vốn tự có', value: equityPercentage }
        ],
        housePrice: housePrice,
        loanAmount: loanAmount,
        equityAmount: equityAmount,
        loanPercentage: loanPercentage,
        equityPercentage: equityPercentage,
        annotations: [
          {
            text: `${loanPercentage}% ~ ${loanAmount} tỷ VND`,
            description: "Số tiền bạn cần vay"
          },
          {
            text: `${equityPercentage}% ~ ${equityAmount} tỷ VND`,
            description: "Số tiền bạn cần tích lũy"
          },
          {
            text: `${housePrice} tỷ VND`,
            description: "Dự kiến giá trị căn nhà vào thời điểm mua"
          }
        ]
      },
      
      // Section 2: Expert Explanation
      expertExplanation: {
        heading: `Tại sao chúng tôi gợi ý bạn vay ${loanPercentage}%?`,
        intro: "Đây là mức vay hợp lý, nằm trong khoảng bạn có thể trả nợ được. Con số này tính toán dựa trên:",
        explanationPoints: explanationPoints,
        warning: "Nếu tăng tỷ lệ vay 60-70% giá trị căn nhà thì sẽ không nằm trong vùng khả năng trả nợ an toàn của bạn, trừ khi bạn có thu nhập đột biến gấp 2, 3 lần. Tỷ lệ nợ này có thể giảm nếu bạn có sự hỗ trợ tài chính thêm từ gia đình.",
        // Populate static explanations, matching current UI fallbacks
        reasoningForHouseGrowth: "Do nhu cầu ở cao, đô thị hóa nhanh, chi phí xây dựng tăng và dòng tiền đầu tư liên tục đổ vào bất động sản. Ngoài ra, đây cũng là mức tăng giá ổn định hàng năm, nhất là tại TP.HCM và Hà Nội – nơi quỹ đất khan hiếm và hạ tầng liên tục mở rộng.",
        reasoningForInterestRate: "Con số này này dựa trên chi phí huy động vốn, rủi ro tín dụng, chi phí vận hành của ngân hàng, cùng với chính sách tiền tệ và lạm phát hiện tại ở Việt Nam. Đây là mức lãi suất cân bằng dựa trên thị trường và kinh tế thực tế."
      },
      
      // Section 3: Recommendations
      recommendations: {
        loanTerm: {
          years: loanTermYears,
          months: plan.loanTermMonths
        },
        interestRate: plan.loanInterestRate,
        note: "con số này có vẻ cao nhưng là phép tính an toàn để dự phòng biến động của thị trường và lãi suất cho vay"
      },
      
      // Section 4: Amortization Schedule
      amortizationSchedule,
      
      // Payment method
      paymentMethod: effectivePaymentMethod
    };
  } catch (error) {
    console.error(`Error generating Capital Structure section:`, error);
    return {
      error: true,
      message: `Chúng tôi gặp sự cố khi tạo phần này. Vui lòng làm mới trang để thử lại.`,
      details: error instanceof Error ? error.message : 'Lỗi không xác định'
    };
  }
}
