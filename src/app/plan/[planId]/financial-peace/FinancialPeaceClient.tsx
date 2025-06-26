"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckIcon, Edit3, ArrowLeft } from "lucide-react";
import { FeedbackButton } from "@/components/feedback-button";
import type { ProjectionResult, ProjectionRow } from "@/lib/calculations/affordability";
import { calculateLoanSummary, LoanSummary } from "@/lib/calculations/projections/calculateLoanSummary";
import { editPlan } from "@/actions";
import { Plan } from "@prisma/client";
import { formatNumber } from "@/actions/utils/formatters";

interface FinancialPeaceClientProps {
  plan: Plan;
  affordabilityResult: ProjectionResult;
}

export function FinancialPeaceClient({ plan, affordabilityResult }: FinancialPeaceClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("mua-nha");
  const [isEditing, setIsEditing] = useState(false);

  const confirmedYearData: ProjectionRow | undefined = useMemo(() => {
    if (!plan || !affordabilityResult?.projectionData || !plan.confirmedPurchaseYear) return undefined;
    return affordabilityResult.projectionData.find((p: ProjectionRow) => p.year === plan.confirmedPurchaseYear);
  }, [plan, affordabilityResult]);

  const loanSummary: LoanSummary | undefined = useMemo(() => {
    if (!confirmedYearData) return undefined;
    return calculateLoanSummary(confirmedYearData);
  }, [confirmedYearData]);

  const incomeToExpenseRatio = useMemo(() => {
    if (!confirmedYearData || !confirmedYearData.annualIncome) return 0;
    return (confirmedYearData.annualExpenses / confirmedYearData.annualIncome) * 100;
  }, [confirmedYearData]);

  const handleEditAssumptions = async () => {
    setIsEditing(true);
    try {
      await editPlan(plan.id, undefined, "assumptions");
    } catch (error) {
      console.error("Error editing plan (assumptions):", error);
      setIsEditing(false);
    }
  };

  if (!confirmedYearData || !loanSummary) {
    return (
      <main className="min-h-screen bg-slate-950 p-4 text-white">
        <div className="container mx-auto max-w-2xl md:max-w-3xl lg:max-w-4xl">
          <header className="flex justify-between items-center py-6">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-300 hover:text-white">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">LƯU Ý</h1>
            <Button variant="ghost" size="icon" onClick={handleEditAssumptions} className="text-slate-300 hover:text-white">
              <Edit3 className="h-5 w-5" />
            </Button>
          </header>
          <Card className="border-red-600 bg-slate-800">
            <CardHeader>
              <CardTitle className="text-red-400">Lỗi</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-red-300">Không thể tải dữ liệu kế hoạch hoặc dữ liệu không đầy đủ.</p>
              <div className="mt-4">
                <Button onClick={() => window.location.reload()} variant="outline" className="text-slate-200 border-slate-600 hover:bg-slate-700">Thử lại</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const muaNhaItems = [
    { title: "Tăng lương", description: `Tăng lương trung bình ${plan.pctSalaryGrowth}%/năm đến năm ${plan.confirmedPurchaseYear}`, details: "Bạn cần nỗ lực tăng lương từ giờ cho tới thời điểm mua để đảm bảo tích luỹ đủ tiền mua nhà. Chúng tôi khuyến nghị bạn liên tục học hỏi, nâng cao kỹ năng và tìm kiếm cơ hội phát triển sự nghiệp." },
    { title: "Duy trì lãi suất đầu tư", description: `Duy trì lãi suất đầu tư ${plan.pctInvestmentReturn}%/năm đến năm ${plan.confirmedPurchaseYear}`, details: "Nội dung chi tiết về duy trì lãi suất đầu tư..." },
    { title: "Kỷ luật chi tiêu", description: `Giữ vững kỷ luật chi tiêu tối đa ${Math.round(incomeToExpenseRatio)}% thu nhập`, details: "Bạn cần nỗ lực tăng lương từ giờ cho tới thời điểm mua để đảm bảo tích luỹ đủ tiền mua nhà. Chúng tôi khuyến nghị bạn liên tục học hỏi, nâng cao kỹ năng và tìm kiếm cơ hội phát triển sự nghiệp." },
    { title: "Chấp nhận giá nhà sẽ tăng", description: `Chấp nhận giá nhà sẽ tăng ${plan.pctHouseGrowth}% mỗi năm`, details: "Nội dung chi tiết về việc chấp nhận giá nhà tăng..." },
  ];

  const traNoItems = [
    { title: "Xây dựng quỹ dự phòng", description: "Xây dựng quỹ có giá trị 6 tháng chi sinh hoạt", details: "Nội dung chi tiết về xây dựng quỹ dự phòng..." },
    { title: "Trang bị bảo hiểm", description: `Trang bị bảo hiểm có giá trị 5% thu nhập hàng năm`, details: "Bạn cần nỗ lực tăng lương từ giờ cho tới thời điểm mua để đảm bảo tích luỹ đủ tiền mua nhà. Chúng tôi khuyến nghị bạn liên tục học hỏi, nâng cao kỹ năng và tìm kiếm cơ hội phát triển sự nghiệp." },
  ];
  
  const familyLoanAmount = plan.familySupportType === 'loan' ? plan.familySupportAmount : 0;

  return (
    <main className="min-h-screen bg-black text-white p-2 md:p-4">
      <div className="container mx-auto max-w-5xl"> 
        <header className="flex justify-between items-center py-4 md:py-6 sticky top-0 bg-black z-10">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-300 hover:text-white">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg md:text-xl font-semibold">LƯU Ý</h1>
          <div className="w-10 h-10"></div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 rounded-md p-1">
            <TabsTrigger value="mua-nha" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-300 rounded-sm py-1.5 text-sm md:text-base">Mua nhà</TabsTrigger>
            <TabsTrigger value="tra-no" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-300 rounded-sm py-1.5 text-sm md:text-base">Trả nợ</TabsTrigger>
          </TabsList>

          <TabsContent value="mua-nha" className="mt-6 bg-slate-900 rounded-xl p-4 md:p-6">
            <div className="text-center mb-6">
              <img src="/financial_peace_mua_nha.png" alt="Mua nhà illustration" className="bg-slate-700 h-32 w-32 md:h-40 md:w-40 mx-auto rounded-lg mb-4 object-contain" />
              <p className="text-sm md:text-base text-slate-300">Bạn sẽ mua nhà vào</p>
              <p className="text-2xl md:text-3xl font-bold" style={{color: '#00ACB8'}}>NĂM {plan.confirmedPurchaseYear}</p>
            </div>
            <h3 className="text-base md:text-lg font-semibold mb-3 text-slate-100">Để đảm bảo khả năng mua nhà, bạn cần:</h3>
            <Accordion type="multiple" className="w-full space-y-2">
              {muaNhaItems.map((item, index) => (
                <AccordionItem key={index} value={`item-mua-${index}`} className="bg-slate-800 rounded-lg border-none px-3">
                  <AccordionTrigger className="text-left hover:no-underline py-3 text-sm md:text-base">
                    <div className="flex items-center w-full">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-100">{item.title}</p>
                        <p className="text-xs text-slate-400">{item.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3 pt-1 text-xs md:text-sm text-slate-300">{item.details}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="mt-8 grid grid-cols-2 gap-3 md:gap-4">
              <Button variant="outline" onClick={handleEditAssumptions} disabled={isEditing} className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200 w-full py-2.5 text-sm md:text-base">
                {isEditing ? "Đang xử lý..." : "Thay đổi giả định"}
              </Button>
              <Button onClick={() => setActiveTab("tra-no")} className="bg-white text-black hover:bg-slate-200 w-full py-2.5 text-sm md:text-base">Tiếp tục</Button>
            </div>
          </TabsContent>

          <TabsContent value="tra-no" className="mt-6 bg-slate-900 rounded-xl p-4 md:p-6">
            <div className="text-center mb-6">
              <img src="/financial_peace_tra_no.png" alt="Trả nợ illustration" className="bg-slate-700 h-32 w-32 md:h-40 md:w-40 mx-auto rounded-lg mb-4 object-contain" />
              <p className="text-sm md:text-base text-slate-300">Bạn sẽ trả góp ngân hàng hàng tháng</p>
              <p className="text-2xl md:text-3xl font-bold" style={{color: '#00ACB8'}}>{formatNumber(loanSummary.monthlyPayment, "triệu VNĐ/tháng")}</p>
               {familyLoanAmount && familyLoanAmount > 0 && (
                <p className="text-sm md:text-base text-slate-400 mt-2">
                  Khoản vay gia đình {formatNumber(familyLoanAmount)} sẽ được trả sau.
                </p>
              )}
            </div>
            <h3 className="text-base md:text-lg font-semibold mb-3 text-slate-100">Để đảm bảo khả năng trả nợ, bạn cần:</h3>
            <Accordion type="multiple" className="w-full space-y-2">
              {traNoItems.map((item, index) => (
                <AccordionItem key={index} value={`item-tra-${index}`} className="bg-slate-800 rounded-lg border-none px-3">
                  <AccordionTrigger className="text-left hover:no-underline py-3 text-sm md:text-base">
                     <div className="flex items-center w-full">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-100">{item.title}</p>
                        <p className="text-xs text-slate-400">{item.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3 pt-1 text-xs md:text-sm text-slate-300">{item.details}</AccordionContent>
                </AccordionItem>
              ))}
              <AccordionItem value="loan-details" className="bg-slate-800 rounded-lg border-none px-3">
                <AccordionTrigger className="text-left hover:no-underline py-3 text-sm md:text-base">
                  <div className="flex items-center w-full">
                    <div className="flex-1">
                      <p className="font-medium" style={{color: '#00ACB8'}}>Thông tin về khoản vay</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3 pt-1 text-xs md:text-sm text-slate-300 space-y-1.5">
                  <div className="flex justify-between"><span>Số tiền vay ngân hàng:</span> <span className="font-medium text-slate-100">{formatNumber(loanSummary.loanAmount)}</span></div>
                  {familyLoanAmount && familyLoanAmount > 0 && (
                     <div className="flex justify-between"><span>Số tiền vay gia đình:</span> <span className="font-medium text-slate-100">{formatNumber(familyLoanAmount)}</span></div>
                  )}
                  <div className="flex justify-between"><span>Trả góp ngân hàng:</span> <span className="font-medium text-slate-100">{formatNumber(loanSummary.monthlyPayment, "VNĐ/tháng")}</span></div>
                  <div className="flex justify-between"><span>Tổng tiền trả ngân hàng:</span> <span className="font-medium text-slate-100">{formatNumber(loanSummary.totalPayments)}</span></div>
                  <div className="flex justify-between"><span>Lãi suất vay ngân hàng:</span> <span className="font-medium text-slate-100">{plan.loanInterestRate}%/năm</span></div>
                  <div className="flex justify-between"><span>Thời gian vay:</span> <span className="font-medium text-slate-100">{plan.loanTermYears} năm</span></div>
                  <div className="flex justify-between"><span>Số dư còn lại hàng tháng:</span> <span className="font-medium text-green-400">{formatNumber(loanSummary.bufferAmount, "VNĐ/tháng")}</span></div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <div className="mt-8 grid grid-cols-2 gap-3 md:gap-4">
              <Button variant="outline" onClick={handleEditAssumptions} disabled={isEditing} className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200 w-full py-2.5 text-sm md:text-base">
                {isEditing ? "Đang xử lý..." : "Thay đổi giả định"}
              </Button>
              <Button asChild className="bg-white text-black hover:bg-slate-200 w-full py-2.5 text-sm md:text-base">
                <Link href={`/plan/${plan.id}/report`}>Báo cáo chi tiết</Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        <FeedbackButton />
      </div>
    </main>
  );
} 