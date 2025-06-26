import { ProjectionRow } from "@/lib/calculations/affordability";
import { Plan as PrismaPlan } from "@prisma/client";
import { LoanSummary } from "@/lib/calculations/projections/calculateLoanSummary";

// Define types for Amortization Schedule
export interface MonthlyAmortizationItem {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface YearlyAmortizationItem {
  year: number;
  totalPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  remainingBalance: number;
}

export interface AmortizationSummary {
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
 * Generate amortization schedule for a loan. (RESTORED LOGIC)
 * Supports both fixed and decreasing payment methods.
 */
export function generateAmortizationSchedule(
  loanAmount: number,
  annualInterestRate: number,
  termYears: number,
  paymentMethod: string = "fixed"
): AmortizationScheduleData {
  if (loanAmount <= 0) {
    return {
      monthlySchedule: [],
      yearlySchedule: [],
      summary: { totalPayment: 0, totalInterest: 0, monthlyPayment: 0 },
    };
  }

  const termMonths = termYears * 12;
  const monthlyRate = annualInterestRate / 12 / 100;
  let remainingBalance = loanAmount;
  const monthlySchedule: MonthlyAmortizationItem[] = [];
  const yearlySchedule: YearlyAmortizationItem[] = [];
  
  let yearlyPayment = 0, yearlyPrincipal = 0, yearlyInterest = 0;
  let totalPayment = 0, totalInterest = 0;
  let firstMonthPayment = 0, lastMonthPayment = 0;

  if (termMonths <= 0) {
    return { monthlySchedule, yearlySchedule, summary: { totalPayment, totalInterest, monthlyPayment: 0 } };
  }

  const principalPerMonth = loanAmount / termMonths;

  for (let month = 1; month <= termMonths; month++) {
    const interest = remainingBalance * monthlyRate;
    let principal, payment;

    if (paymentMethod === 'fixed') {
      payment = (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
        principal = payment - interest;
    } else { // decreasing
      principal = principalPerMonth;
      payment = principal + interest;
    }

    if (month === 1) firstMonthPayment = payment;
    if (month === termMonths) lastMonthPayment = payment;

    remainingBalance -= principal;
    
    if (remainingBalance < 0) { // Final month adjustment
      principal += remainingBalance;
      payment = principal + interest;
      remainingBalance = 0;
    }

    monthlySchedule.push({ month, payment, principal, interest, remainingBalance });

    yearlyPayment += payment;
    yearlyPrincipal += principal;
    yearlyInterest += interest;
    totalPayment += payment;
    totalInterest += interest;

    if (month % 12 === 0 || month === termMonths) {
      yearlySchedule.push({ year: Math.ceil(month / 12), totalPayment: yearlyPayment, totalPrincipal: yearlyPrincipal, totalInterest: yearlyInterest, remainingBalance });
      yearlyPayment = 0; yearlyPrincipal = 0; yearlyInterest = 0;
    }
  }

  return {
    monthlySchedule,
    yearlySchedule,
    summary: { 
      totalPayment, 
      totalInterest, 
      monthlyPayment: firstMonthPayment, // For 'fixed', this is the constant payment. For 'decreasing', it's the highest.
      lastMonthPayment: paymentMethod === 'decreasing' ? lastMonthPayment : undefined,
    },
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

// Define a clear error type
export interface CapitalStructureError {
  error: true;
  message: string;
  details: string;
}

// New type for family loan details
export interface FamilyLoanDetails {
  amount: number;
  repaymentType: string;
  interestRate?: number;
  termYears?: number;
  monthlyPayment: number;
}

export interface CapitalStructureReportData {
  plan: PrismaPlan;
  confirmedYearData: ProjectionRow;
  loanSummary: LoanSummary;
  currentSituation: {
    introText: string;
    donutChart: DonutChartItemCS[];
    housePrice: number;
    totalLoanAmount: number;
    bankLoanAmount: number;
    familyLoanAmount: number;
    equityAmount: number;
    bankLoanPercentage: number;
    familyLoanPercentage: number;
    equityPercentage: number;
    annotations: AnnotationItemCS[];
  };
  expertExplanation: {
    heading: string;
    intro: string;
    explanationPoints: string[];
    warning: string;
    reasoningForHouseGrowth?: string;
    reasoningForInterestRate?: string;
  };
  recommendations: {
    loanTerm: {
      years: number;
    };
    interestRate: number;
    note: string;
  };
  amortizationSchedule: AmortizationScheduleData;
  familyLoanDetails?: FamilyLoanDetails;
}

/**
 * Generate the Capital Structure section of the report (UPDATED with Payment Method & Family Loan)
 */
export async function generateCapitalStructureSection(
  plan: PrismaPlan, // Use the PrismaPlan type directly
  confirmedYearData: ProjectionRow,
  loanSummary: LoanSummary
): Promise<CapitalStructureReportData | CapitalStructureError> {
  try {
    if (plan.confirmedPurchaseYear === null) {
      throw new Error("Confirmed purchase year is not set.");
    }

    const familySupport = plan.familySupport;
    const isFamilyLoan = familySupport?.familySupportType === 'LOAN' && (familySupport.familySupportAmount ?? 0) > 0;
    // Specifically check for gifts designated to be received AT THE TIME OF PURCHASE.
    const isFamilyGiftAtPurchase = familySupport?.familySupportType === 'GIFT' && familySupport.familyGiftTiming === 'AT_PURCHASE' && (familySupport.familySupportAmount ?? 0) > 0;

    // --- Calculate Funding Breakdown ---
    const bankLoanAmount = Math.round(confirmedYearData.loanAmountNeeded);
    
    // This represents the user's own accumulated savings. The projection engine has already correctly
    // included any "gift-now" amounts in this `cumulativeSavings` figure.
    const userEquityAmount = Math.round(confirmedYearData.cumulativeSavings);

    // This is the loan from family, treated as a distinct source of capital.
    const familyLoanAmount = isFamilyLoan ? (familySupport?.familySupportAmount ?? 0) : 0;
    
    // This is the gift from family received AT THE TIME OF PURCHASE, also a distinct source.
    const familyGiftAtPurchaseAmount = isFamilyGiftAtPurchase ? (familySupport?.familySupportAmount ?? 0) : 0;

    const totalHousePrice = confirmedYearData.housePriceProjected;

    // --- Data Structuring for Donut Chart ---
    const donutChartData: DonutChartItemCS[] = [
      { name: 'Vốn tự có', value: userEquityAmount },
      { name: 'Vay ngân hàng', value: bankLoanAmount },
    ];
    if (isFamilyLoan) {
      donutChartData.push({ name: 'Vay gia đình', value: familyLoanAmount });
    }
    // Only add the "Gift" slice to the chart if it's received AT PURCHASE.
    if (isFamilyGiftAtPurchase) {
      donutChartData.push({ name: 'Hỗ trợ từ gia đình', value: familyGiftAtPurchaseAmount });
    }
    
    const totalLoanAmount = bankLoanAmount + familyLoanAmount;
    
    const calculatedHousePrice = userEquityAmount + bankLoanAmount + familyLoanAmount + familyGiftAtPurchaseAmount;
    
    const introText = `Để mua căn nhà trị giá ${formatAsCurrency(calculatedHousePrice)} vào năm ${plan.confirmedPurchaseYear}, cơ cấu vốn của bạn được phân bổ như sau.`;

    // --- Build Family Loan Details Object ---
    let familyLoanDetails: FamilyLoanDetails | undefined = undefined;
    if (isFamilyLoan && familySupport) { // Check for familySupport existence
        let monthlyPayment = 0;
        // Use familyLoanTermYears from the nested object
        const termYears = familySupport.familyLoanTermYears; 
        
        if (familySupport.familyLoanRepaymentType === 'MONTHLY' && termYears && termYears > 0) {
            // A simple calculation for monthly payment without interest, can be enhanced
            monthlyPayment = familyLoanAmount / (termYears * 12);
        }

        familyLoanDetails = {
            amount: familyLoanAmount,
            repaymentType: familySupport.familyLoanRepaymentType || 'LUMP_SUM',
            interestRate: familySupport.familyLoanInterestRate || 0,
            termYears: termYears,
            monthlyPayment: Math.round(monthlyPayment)
        };
    }

    // --- Data Structuring ---
    const annotations: AnnotationItemCS[] = [
        {
            text: `${formatAsCurrency(userEquityAmount)}`,
            description: `(${Math.round((userEquityAmount / calculatedHousePrice) * 100)}%) là số vốn tự có của bạn.`
        },
        {
            text: `${formatAsCurrency(bankLoanAmount)}`,
            description: `(${Math.round((bankLoanAmount / calculatedHousePrice) * 100)}%) là số tiền bạn cần vay ngân hàng.`
        }
    ];
    if (isFamilyLoan) {
        annotations.push({
            text: `${formatAsCurrency(familyLoanAmount)}`,
            description: `(${Math.round((familyLoanAmount / calculatedHousePrice) * 100)}%) là số tiền bạn vay từ gia đình.`
        });
    }
    if (isFamilyGiftAtPurchase) {
        annotations.push({
            text: `${formatAsCurrency(familyGiftAtPurchaseAmount)}`,
            description: `(${Math.round((familyGiftAtPurchaseAmount / calculatedHousePrice) * 100)}%) là số tiền hỗ trợ từ gia đình được nhận tại thời điểm mua nhà.`
        });
    }

    const paymentMethod = plan.paymentMethod || 'fixed';
    const explanationPoints = [];
    if (plan.hasCoApplicant) {
      explanationPoints.push("Thu nhập hiện tại của hai vợ chồng, đã điều chỉnh tăng thu nhập mỗi năm.");
    } else {
      explanationPoints.push("Thu nhập hiện tại của bạn, đã điều chỉnh tăng thu nhập mỗi năm.");
    }
    
    explanationPoints.push("Tích lũy từ tiền tiết kiệm và đầu tư hàng tháng.");

    if (isFamilyLoan) {
      const familyLoanTerms = plan.familyLoanTermYears 
        ? `, trả trong ${plan.familyLoanTermYears} năm` 
        : '';
      explanationPoints.push(`Vay gia đình ${formatAsCurrency(familyLoanAmount)} trong ${familyLoanTerms}.`);
    } else if (familyGiftAtPurchaseAmount > 0) {
      explanationPoints.push(`Gia đình tặng ${formatAsCurrency(familyGiftAtPurchaseAmount)}.`);
    }

    explanationPoints.push(`Khoản vay ngân hàng được tính toán dựa trên phương thức trả nợ ${paymentMethod === 'fixed' ? 'Cố định' : 'Giảm dần'}.`);

    const amortizationSchedule = generateAmortizationSchedule(
      bankLoanAmount,
      plan.loanInterestRate,
      plan.loanTermYears,
      paymentMethod
    );
    
    // Final Data Structure
    return {
      plan,
      confirmedYearData,
      loanSummary,
      currentSituation: {
        introText: introText,
        donutChart: donutChartData,
        housePrice: Math.round(calculatedHousePrice),
        totalLoanAmount: Math.round(totalLoanAmount),
        bankLoanAmount: bankLoanAmount,
        familyLoanAmount: familyLoanAmount,
        equityAmount: Math.round(userEquityAmount),
        bankLoanPercentage: Math.round((bankLoanAmount / calculatedHousePrice) * 100),
        familyLoanPercentage: Math.round((familyLoanAmount / calculatedHousePrice) * 100),
        equityPercentage: Math.round((userEquityAmount / calculatedHousePrice) * 100),
        annotations: annotations,
      },
      expertExplanation: {
        heading: "Giải thích của chuyên gia",
        intro: "Số tiền bạn có thể vay được tính toán dựa trên:",
        explanationPoints,
        warning: "Đây là phương án được tính toán với điều kiện rủi ro thấp nhất và có khả năng thực hiện cao nhất. Mọi thay đổi về lãi suất vay và các yếu tố khác có thể ảnh hưởng đến kết quả này.",
        reasoningForHouseGrowth: `Giá nhà được dự báo tăng trưởng ở mức ${plan.pctHouseGrowth}% mỗi năm, dựa trên dữ liệu lịch sử và các yếu tố kinh tế vĩ mô. Điều này có nghĩa là căn nhà mục tiêu của bạn sẽ có giá cao hơn trong tương lai.`,
        reasoningForInterestRate: `Mức lãi suất vay ${plan.loanInterestRate}% được đưa ra dựa trên mức lãi suất trung bình của các ngân hàng hiện tại cho các khoản vay mua nhà. Mức lãi suất này có thể thay đổi tùy thuộc vào chính sách của từng ngân hàng và điều kiện thị trường tại thời điểm vay.`
      },
      recommendations: {
        loanTerm: {
          years: plan.loanTermYears,
        },
        interestRate: plan.loanInterestRate,
        note: "Duy trì công việc ổn định và điểm tín dụng tốt để được duyệt khoản vay với lãi suất ưu đãi."
      },
      amortizationSchedule: amortizationSchedule,
      familyLoanDetails: familyLoanDetails
    };
  } catch (error) {
    console.error(`Error in generateCapitalStructureSection:`, error);
    return {
      error: true,
      message: error instanceof Error ? error.message : "An unknown error occurred",
      details: error instanceof Error ? error.stack ?? "" : "",
    };
  }
}

// Helper function to format currency for display
function formatAsCurrency(amount: number): string {
    if (amount >= 1000) {
        return `${(amount / 1000).toFixed(2)} tỷ VND`;
  }
    return `${amount.toLocaleString()} triệu VND`;
}
