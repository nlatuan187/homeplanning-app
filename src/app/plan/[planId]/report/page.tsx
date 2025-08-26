"use client";

import { useEffect, useState } from "react"; // useMemo and Link removed
import { useRouter, useParams } from "next/navigation";
// Link removed
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit3 } from "lucide-react";
import { FeedbackButton } from "@/components/feedback-button";
import LoadingOverlay from "@/components/ui/loading-overlay";
import { generateFinalReport, ReportSections } from "@/actions/generateFinalReport";
import { checkReportCacheStatus } from "@/actions/checkReportCacheStatus";
import { editPlan as editPlanAction } from "@/actions"; // Import editPlan action
import { ProjectionRow } from "@/lib/calculations/affordability";
import { LoanSummary } from "@/lib/calculations/projections/calculateLoanSummary";
import { Plan } from "@prisma/client";
import ReportHeaderCard from "@/components/report/report-header-card"; // Import new header card
import AccumulationReportTab from '@/components/report/tabs/accumulation-tab';
import SpendingReportTab from '@/components/report/tabs/spending-tab';
import BorrowingReportTab from '@/components/report/tabs/borrowing-tab'; // Import the actual component
import BackupPlansSection from '@/components/report/BackupPlansSection';
import InsuranceSection from '@/components/report/InsuranceSection';
// ContingencyReportTab and ProtectionReportTab placeholders removed


const REPORT_LOADING_MESSAGES = [
  "Đang tính toán lại các chỉ số tài chính...",
  "Đang phân tích hiệu quả tài sản và cấu trúc vốn...",
  "Đang đánh giá kế hoạch chi tiêu và bảo vệ rủi ro...",
  "Đang xem xét kế hoạch dự phòng và mục tiêu tương lai...",
  "Hoàn tất! Chuẩn bị hiển thị báo cáo chi tiết..."
];

const REPORT_LOADING_DURATIONS = [1250, 1250, 1250, 1250, 500]; // Total ~5.5s

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;

  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [plan, setPlan] = useState<Plan | null>(null);
  const [projectionData, setProjectionData] = useState<ProjectionRow[] | null>(null);
  const [confirmedYearData, setConfirmedYearData] = useState<ProjectionRow | null>(null);
  const [loanSummary, setLoanSummary] = useState<LoanSummary | null>(null);
  const [reportSections, setReportSections] = useState<ReportSections | null>(null);
  const [isEditingPlan, setIsEditingPlan] = useState(false); // State for edit button
  
  const [activeTab, setActiveTab] = useState("tich-luy");

  useEffect(() => {
    if (!planId) return;

    let initialOverlayStateSet = false;

    const fetchReportData = async () => {
      // Don't set isLoadingReport true here yet, let cache check decide overlay
      try {
        // First, check cache status to decide if loading animation is needed
        if (!initialOverlayStateSet) {
          const cacheStatusResult = await checkReportCacheStatus(planId);
          if (cacheStatusResult.planExists && cacheStatusResult.cacheIsValid) {
            setShowLoadingOverlay(false); // Valid cache, no loading animation
            setIsLoadingReport(false); // Data will load quickly from cache via generateFinalReport
          } else {
            setShowLoadingOverlay(true); // No valid cache or plan issue, show loading animation
            setIsLoadingReport(true); 
          }
          initialOverlayStateSet = true;
        } else if (!showLoadingOverlay) {
          // If overlay was skipped due to cache, ensure isLoadingReport is false before fetching
          // This case might be redundant if generateFinalReport is fast with cache
           setIsLoadingReport(false);
        }


        // Now, fetch the actual report data
        // If cache was valid, generateFinalReport will be fast.
        // If not, isLoadingReport is true and overlay is showing.
        const result = await generateFinalReport(planId);
        console.log("generateFinalReport result from server:", JSON.stringify(result, null, 2));

        if (result.success) {
          const successResult = result as typeof result & { plan?: Plan; projectionData?: ProjectionRow[]; confirmedYearData?: ProjectionRow; loanSummary?: LoanSummary; reportSections?: ReportSections };
          
          // Log individual properties before the check
          console.log("Checking successResult.plan:", successResult.plan);
          console.log("Checking successResult.projectionData:", successResult.projectionData);
          console.log("Checking successResult.confirmedYearData:", successResult.confirmedYearData);
          console.log("Checking successResult.loanSummary:", successResult.loanSummary);
          console.log("Checking successResult.reportSections:", successResult.reportSections);

          if (successResult.plan && successResult.projectionData && successResult.confirmedYearData && successResult.loanSummary && successResult.reportSections) {
            setPlan(successResult.plan);
            setProjectionData(successResult.projectionData);
            setConfirmedYearData(successResult.confirmedYearData);
            setLoanSummary(successResult.loanSummary);
            setReportSections(successResult.reportSections);
          } else {
            throw new Error("Dữ liệu báo cáo không đầy đủ từ server.");
          }
        } else {
          // Access error from the failed result
          const errorResult = result as typeof result & { error?: string };
          throw new Error(errorResult.error || "Không thể tạo báo cáo.");
        }
      } catch (err) {
        console.error("Error generating final report:", err);
        setError(err instanceof Error ? err.message : "Lỗi không xác định khi tạo báo cáo.");
        setShowLoadingOverlay(false); // Hide overlay on error to show error message
      } finally {
        // This will be called by onLoadingComplete if successful, or above if error
        // setIsLoadingReport(false); 
      }
    };

    fetchReportData();
  }, [planId]);

  const handleEditPlan = async () => {
    if (!planId) return;
    setIsEditingPlan(true);
    try {
      // Call editPlan server action to save revision and redirect
      await editPlanAction(planId, undefined, "goal"); 
    } catch (error) {
      console.error("Error initiating plan edit from report page:", error);
      // Optionally set an error state here to display to the user
      setIsEditingPlan(false); // Reset editing state on error
    }
    // setIsEditingPlan(false) might not be reached if redirect in editPlanAction is successful
  };

  const onLoadingComplete = () => {
    setShowLoadingOverlay(false);
    setIsLoadingReport(false); // Now report data should be ready
  };

  if (isLoadingReport && showLoadingOverlay) {
    return (
      <LoadingOverlay
        messages={REPORT_LOADING_MESSAGES}
        durations={REPORT_LOADING_DURATIONS}
        onSequenceComplete={onLoadingComplete}
      />
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white p-4">
        <div className="container mx-auto max-w-5xl text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Lỗi tạo báo cáo</h1>
          <p className="text-slate-300 mb-6">{error}</p>
          <Button onClick={() => router.push(`/plan/${planId}/financial-peace`)}>Quay lại</Button>
        </div>
      </main>
    );
  }
  
  if (!plan || !projectionData || !reportSections || !confirmedYearData || !loanSummary ) {
     // This state can occur briefly if loading overlay finishes before data is fully set,
     // or if there was an error not caught by the error state.
    return (
      <main className="min-h-screen bg-black text-white p-4">
        <div className="container mx-auto max-w-5xl text-center">
          <p className="text-slate-300">Đang tải dữ liệu báo cáo...</p>
           {/* Fallback loading spinner if needed */}
        </div>
      </main>
    );
  }

  // Placeholder for gradient background images - names to be confirmed
  const gradientImages: Record<string, string> = {
    "tich-luy": "/gradient_tichluy.png",
    "chi-tieu": "/gradient_chitieu.png",
    "vay-muon": "/gradient_vaymuon.png",
    "du-phong": "/gradient_duphong.png",
    "bao-ve": "/gradient_baove.png",
  };
  
  const currentGradient = gradientImages[activeTab] || gradientImages["tich-luy"];

  // Determine ReportHeaderCard props based on activeTab and plan
  let headerCardTitle = "";
  let headerCardDescription = "";

  // Helper function for formatting currency, can be moved to a util file if used elsewhere
  const formatMillions = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return Math.round(value).toLocaleString();
  };

  if (plan && projectionData && projectionData.length > 0) {
    switch (activeTab) {
      case "tich-luy":
        headerCardTitle = "MỤC TIÊU TÍCH LŨY";
        headerCardDescription = `Tăng lương trung bình ${plan.pctSalaryGrowth}%/năm, ${projectionData?.some(p=>p.otherIncome > 0) ? "có thêm thu nhập khác, " : ""}và đảm bảo đầu tư sinh lời ${plan.pctInvestmentReturn}%/năm.`;
        break;
      case "chi-tieu":
        headerCardTitle = "MỤC TIÊU CHI TIÊU";
        headerCardDescription = `Kiểm soát mức tăng chi tiêu dưới ${plan.pctExpenseGrowth}%/năm, không thay đổi quá nhiều so với chi tiêu hiện tại.`;
        break;
      case "vay-muon":
        headerCardTitle = "MỤC TIÊU VAY MƯỢN";
        if (confirmedYearData && loanSummary) {
          const loanAmountInBillion = (confirmedYearData.loanAmountNeeded / 1000).toFixed(2);
          const paymentMethodValue = (plan as Plan & { paymentMethod?: "fixed" | "decreasing" }).paymentMethod;
          const paymentMethodText = paymentMethodValue === "decreasing" ? "giảm dần" : "cố định";
          headerCardDescription = `Vay ${loanAmountInBillion} tỷ VND vào năm ${plan.confirmedPurchaseYear} với lãi suất ${plan.loanInterestRate}%/năm và trả góp ${paymentMethodText} hàng tháng.`;
        } else {
          headerCardDescription = "Thông tin vay mượn đang được cập nhật.";
        }
        break;
      case "du-phong":
        headerCardTitle = "MỤC TIÊU DỰ PHÒNG";
        // Ensure projectionData[0] and targetEF exist before trying to format
        const initialEF = projectionData[0]?.targetEF;
        headerCardDescription = `Xây dựng quỹ dự phòng trị giá ${formatMillions(initialEF)} triệu VND và định kỳ hàng năm bổ sung vào quỹ này nếu cần thiết.`;
        break;
      case "bao-ve":
        headerCardTitle = "MỤC TIÊU BẢO VỆ";
        headerCardDescription = "Tham gia bảo hiểm nhân thọ cho bản thân và người phối ngẫu trong vòng 10 năm.";
        break;
      default:
        headerCardTitle = "MỤC TIÊU";
        headerCardDescription = "Xem xét các mục tiêu tài chính của bạn.";
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Top Navigation Bar (Back, Edit) - Constrained Width, Sticky */}
      <header className="container mx-auto max-w-5xl px-4 py-3 flex justify-between items-center sticky top-0 bg-black z-40">
        <Button variant="outline" onClick={() => router.push(`/dashboard`)} className="text-slate-300 hover:text-white cursor-pointer">
          Trở lại dashboard
        </Button>
        {/* Title removed from here */}
        <Button variant="ghost" size="icon" onClick={handleEditPlan} disabled={isEditingPlan} className="text-slate-300 hover:text-white cursor-pointer">
          {isEditingPlan ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-slate-300"></div> : <Edit3 className="h-5 w-5" />}
        </Button>
      </header>

      {/* Scrollable Content Area - Constrained Width */}
      <div className="container mx-auto max-w-5xl px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Sticky Header for TabsList and ReportHeaderCard */}
          <div 
            className="z-30 bg-cover bg-center rounded-xl mt-1" // Assuming top-nav height is ~64px (top-16)
            style={{ backgroundImage: `url(${currentGradient})`}}
          >
            <div className="bg-black/40 backdrop-blur-sm p-4 rounded-xl"> {/* Overlay for text readability, also rounded */}
              <TabsList className="grid w-full grid-cols-5 bg-white/10 rounded-lg p-1">
                <TabsTrigger value="tich-luy" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-300 rounded-md py-2 text-xs sm:text-sm">Tích lũy</TabsTrigger>
                <TabsTrigger value="chi-tieu" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-300 rounded-md py-2 text-xs sm:text-sm">Chi tiêu</TabsTrigger>
                <TabsTrigger value="vay-muon" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-300 rounded-md py-2 text-xs sm:text-sm">Vay mượn</TabsTrigger>
                <TabsTrigger value="du-phong" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-300 rounded-md py-2 text-xs sm:text-sm">Dự phòng</TabsTrigger>
                <TabsTrigger value="bao-ve" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-300 rounded-md py-2 text-xs sm:text-sm">Bảo vệ</TabsTrigger>
              </TabsList>
              {/* ReportHeaderCard is inside the gradient box */}
              <ReportHeaderCard title={headerCardTitle} description={headerCardDescription} />
            </div>
          </div>

          <div className="mt-6">
            <TabsContent value="tich-luy">
                <AccumulationReportTab data={reportSections.assetEfficiency} />
            </TabsContent>
            <TabsContent value="chi-tieu">
                <SpendingReportTab data={reportSections.spendingPlan} setActiveTab={setActiveTab} />
            </TabsContent>
            <TabsContent value="vay-muon">
                <BorrowingReportTab data={reportSections.capitalStructure} />
            </TabsContent>
            <TabsContent value="du-phong">
                <BackupPlansSection data={reportSections.backupPlans} />
            </TabsContent>
            <TabsContent value="bao-ve">
                <InsuranceSection data={reportSections.insurance} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
      <FeedbackButton planId={plan.id} userEmail={plan.userEmail ?? ''} />
    </main>
  );
}
