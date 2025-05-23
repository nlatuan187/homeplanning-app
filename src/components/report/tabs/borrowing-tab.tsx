"use client";

import { Plan } from "@prisma/client";
import { ProjectionRow } from "@/lib/calculations/affordability";
import { LoanSummary } from "@/lib/calculations/projections/calculateLoanSummary";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import AmortizationScheduleSheet from "../amortization-schedule-sheet";
import { type CapitalStructureReportData } from "@/actions/reportSections/capitalStructure"; // Import correct type, AmortizationScheduleData is part of it

// Local type definitions (CapitalStructureData, MonthlyScheduleItem, YearlyScheduleItem, AmortizationSummary) removed

interface BorrowingReportTabProps {
  plan: Plan | null;
  confirmedYearData: ProjectionRow | null;
  loanSummary: LoanSummary | null;
  capitalStructureData: CapitalStructureReportData | null; // Use imported type
}

// Helper to format currency (can be moved to utils)
const formatCurrency = (value: number | undefined | null, unit = "tỷ VND", precision = 2): string => {
  if (value === undefined || value === null || isNaN(value)) return `N/A ${unit}`;
  if (unit === "tỷ VND") {
    return `${(value / 1000).toFixed(precision)} ${unit}`;
  }
  return `${Math.round(value).toLocaleString()} ${unit}`;
};

const formatMillionsCurrency = (value: number | undefined | null, unit = "triệu VND"): string => {
  if (value === undefined || value === null || isNaN(value)) return `N/A ${unit}`;
  return `${Math.round(value).toLocaleString()} ${unit}`;
}

const BorrowingReportTab: React.FC<BorrowingReportTabProps> = ({ 
  plan, 
  confirmedYearData, 
  loanSummary, 
  capitalStructureData
  // setActiveTab // Removed
}) => {
  const [isAmortizationSheetOpen, setIsAmortizationSheetOpen] = useState(false);

  if (!plan || !confirmedYearData || !loanSummary || !capitalStructureData) {
    return <div className="text-center p-8">Đang tải dữ liệu cho tab Vay mượn...</div>;
  }

  const {
    currentSituation,
    expertExplanation,
    // recommendations: capitalRecs, // Not used directly, part of capitalStructureData
    amortizationSchedule // Directly from capitalStructureData
  } = capitalStructureData;
  
  // const amortizationSchedule = capitalStructureData.amortizationSchedule; // Already destructured


  const loanAmountForDisplay = confirmedYearData.loanAmountNeeded;
  const purchaseYearForDisplay = plan.confirmedPurchaseYear;
  const housePriceGrowthForDisplay = plan.pctHouseGrowth;
  const housePriceForDisplay = confirmedYearData.housePriceProjected;
  // const savingsForDisplay = confirmedYearData.cumulativeSavings; // Unused variable

  const loanTermYears = Math.round(plan.loanTermMonths / 12);
  const monthlyPaymentForDisplay = loanSummary.monthlyPayment;
  const paymentMethodValue = (plan as Plan & { paymentMethod?: "fixed" | "decreasing" }).paymentMethod;
  const paymentMethodText = paymentMethodValue === "decreasing" ? "giảm dần" : "cố định";

  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={["item-1", "item-2", "item-3"]} className="w-full space-y-3"> {/* Auto open accordion */}
        {/* Mục 1: Vay X tỷ VND */}
        <AccordionItem value="item-1" className="bg-slate-900 rounded-lg border-none">
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100">
            1 | Vay {formatCurrency(loanAmountForDisplay)} vào năm {purchaseYearForDisplay}
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3">
            <p className="leading-relaxed">
              Vào năm {purchaseYearForDisplay}, với tốc độ tăng giá nhà {housePriceGrowthForDisplay}%/năm, căn nhà bạn muốn mua sẽ có giá {formatCurrency(housePriceForDisplay)}. 
              Lúc này, số tiền bạn cần vay được tính bằng cách:
            </p>
            <div className="bg-slate-800 p-3 rounded-md space-y-2 text-slate-200"> {/* Changed to bg-slate-800 */}
              <div className="flex justify-between"><span>Giá trị căn nhà:</span> <span>{formatCurrency(currentSituation?.housePrice)}</span></div>
              <hr className="border-slate-600"/>
              <div className="flex justify-between"><span>Số tiền bạn đã tích lũy:</span> <span>{formatCurrency(currentSituation?.equityAmount)}</span></div>
              <hr className="border-slate-600"/>
              <div className="flex justify-between font-semibold"><span>Số tiền bạn cần vay:</span> <span>{formatCurrency(currentSituation?.loanAmount)}</span></div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Mục 2: Trả góp */}
        <AccordionItem value="item-2" className="bg-slate-900 rounded-lg border-none"> {/* Changed to bg-slate-900 */}
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100">
            2 | Trả góp cả gốc và lãi hàng tháng
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3">
            <p className="leading-relaxed">
              Với gói vay trong thời gian {loanTermYears} năm (tương đương {plan.loanTermMonths} tháng), 
              bắt đầu từ tháng đầu tiên sau khi vay, bạn phải trả góp {formatMillionsCurrency(monthlyPaymentForDisplay)}/tháng. 
              Số tiền này sẽ {paymentMethodText} theo thời gian tùy thuộc vào gói vay bạn chọn.
            </p>
            <Button variant="outline" onClick={() => setIsAmortizationSheetOpen(true)} className="w-full bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-100">
              Xem bảng thống kê trả nợ đầy đủ
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Mục 3: Giải thích của chuyên gia */}
        <AccordionItem value="item-3" className="bg-slate-900 rounded-lg border-none"> {/* Changed to bg-slate-900 */}
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100 data-[state=open]:text-cyan-400">
            Giải thích của chuyên gia
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3">
            <div className="bg-slate-800 p-3 rounded-lg">
              <p className="font-semibold text-slate-100 mb-1">Tại sao giá nhà trung bình tăng 10%/năm?</p>
              <p className="leading-relaxed">{expertExplanation?.reasoningForHouseGrowth || "Do nhu cầu ở cao, đô thị hóa nhanh, chi phí xây dựng tăng và dòng tiền đầu tư liên tục đổ vào bất động sản. Ngoài ra, đây cũng là mức tăng giá ổn định hàng năm, nhất là tại TP.HCM và Hà Nội – nơi quỹ đất khan hiếm và hạ tầng liên tục mở rộng."}</p>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg">
              <p className="font-semibold text-slate-100 mb-1">Tại sao lãi suất đi vay là 11%/năm?</p>
              <p className="leading-relaxed">{expertExplanation?.reasoningForInterestRate || "Con số này này dựa trên chi phí huy động vốn, rủi ro tín dụng, chi phí vận hành của ngân hàng, cùng với chính sách tiền tệ và lạm phát hiện tại ở Việt Nam. Đây là mức lãi suất cân bằng dựa trên thị trường và kinh tế thực tế."}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <AmortizationScheduleSheet 
        monthlySchedule={amortizationSchedule?.monthlySchedule} 
        yearlySchedule={amortizationSchedule?.yearlySchedule}
        isOpen={isAmortizationSheetOpen} 
        onOpenChange={setIsAmortizationSheetOpen} 
      />
      {/* Placeholder div for sheet removed as actual sheet is now implemented */}
    </div>
  );
};

export default BorrowingReportTab;
