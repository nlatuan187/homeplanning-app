"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/actions/utils/formatters";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import AmortizationScheduleSheet from "../amortization-schedule-sheet";
import { type CapitalStructureReportData } from "@/actions/reportSections/capitalStructure";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type SectionData<T> = T | { error: true; message: string; details: string };

interface BorrowingReportTabProps {
  data: SectionData<CapitalStructureReportData>;
}

const BorrowingReportTab: React.FC<BorrowingReportTabProps> = ({ data }) => {
  const [isAmortizationSheetOpen, setIsAmortizationSheetOpen] = useState(false);

  if ('error' in data) {
    return (
      <div className="text-center p-8 bg-slate-900 rounded-lg">
        <p className="text-red-500 font-semibold">Lỗi tải dữ liệu</p>
        <p className="text-slate-400 text-sm mt-2">{data.message}</p>
      </div>
    );
  }
  
  const { 
    plan, 
    loanSummary, 
    expertExplanation, 
    amortizationSchedule,
    familyLoanDetails,
    currentSituation
  } = data;

  if (!plan || !loanSummary || !currentSituation) {
    return <div className="text-center p-8">Dữ liệu không đầy đủ cho tab Vay mượn.</div>;
  }
  
  const {
    donutChart,
    bankLoanAmount,
  } = currentSituation;

  const hasFamilySupport = !!(familyLoanDetails || (plan.familySupport?.familySupportType === 'GIFT' && plan.familySupport.familySupportAmount > 0));

  const chartData = donutChart.map(item => ({ name: item.name, value: item.value }));
  const COLORS = ["#00ACB8", "#F2C94C", "#EB5757", "#2F80ED"];

  return (
    <div className="space-y-8">
      {/* Capital Allocation Section */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white">1. Phân bổ Nguồn vốn</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#1C1C1E', 
                    borderColor: '#333333', 
                    borderRadius: '0.5rem' 
                  }}
                  formatter={(value: number, name: string) => [`${formatNumber(value)}`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
              {chartData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg">
                      <div className="flex items-center">
                          <span className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                          <span className="text-slate-300">{item.name}</span>
                      </div>
                      <span className="font-semibold text-white">{formatNumber(item.value)}</span>
                  </div>
              ))}
          </div>
        </CardContent>
        {plan.familySupport?.familySupportType === 'GIFT' && plan.familySupport.familyGiftTiming === 'NOW' && (
          <div className="px-6 pb-4 text-xs text-slate-400 italic">
            * Ghi chú: Khoản hỗ trợ {formatNumber(plan.familySupport.familySupportAmount)} từ gia đình đã được tính vào "Vốn tự có" vì bạn nhận ngay từ bây giờ để đầu tư.
          </div>
        )}
      </Card>
      
      {/* Loan Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bank Loan Details */}
        <Card className={`bg-slate-900/50 border-slate-800 ${!hasFamilySupport ? 'lg:col-span-2' : ''}`}>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">2. Chi tiết Vay Ngân hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Số tiền vay</span>
              <span className="font-medium text-slate-100">{formatNumber(bankLoanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Lãi suất dự kiến</span>
              <span className="font-medium text-slate-100">{plan.loanInterestRate}%/năm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Thời hạn vay</span>
              <span className="font-medium text-slate-100">{plan.loanTermYears} năm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Trả góp hàng tháng</span>
              <span className="font-medium text-cyan-500">{formatNumber(loanSummary.monthlyPayment)}</span>
            </div>
             <Button variant="outline" onClick={() => setIsAmortizationSheetOpen(true)} className="w-full mt-4 bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-100">
              Xem bảng thống kê trả nợ
            </Button>
          </CardContent>
        </Card>

        {/* Family Support Details (Conditional) */}
        {hasFamilySupport && (
           <Card className="bg-slate-900/50 border-slate-800">
             <CardHeader>
               <CardTitle className="text-xl font-semibold text-white">
                 3. {plan.familySupport?.familySupportType === 'LOAN' ? 'Chi tiết Vay Gia đình' : 'Chi tiết Hỗ trợ từ Gia đình'}
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">{plan.familySupport?.familySupportType === 'LOAN' ? 'Số tiền vay' : 'Số tiền được tặng'}</span>
                  <span className="font-medium text-slate-100">{formatNumber(plan.familySupport?.familySupportAmount ?? 0)}</span>
                </div>

                {plan.familySupport?.familySupportType === 'LOAN' && familyLoanDetails ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lãi suất</span>
                      <span className="font-medium text-slate-100">{familyLoanDetails.interestRate ?? 0}%/năm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hình thức trả</span>
                      <span className="font-medium text-slate-100">
                        {familyLoanDetails.repaymentType === 'MONTHLY' ? `Trả góp trong ${familyLoanDetails.termYears} năm` : 'Trả 1 lần khi đáo hạn'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-800/60 rounded-md mt-2 text-slate-300 leading-relaxed">
                      {familyLoanDetails.repaymentType === 'MONTHLY' 
                        ? `Với các thông số trên, bạn cần hoàn trả cho gia đình khoảng ${formatNumber(familyLoanDetails.monthlyPayment)} mỗi tháng.`
                        : `Đây là một khoản nợ cần được hoàn trả vào cuối kỳ hạn ${familyLoanDetails.termYears} năm. Finful sẽ nhắc bạn về nghĩa vụ này.`
                      }
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Thời điểm nhận</span>
                      <span className="font-medium text-slate-100">
                        {plan.familySupport?.familyGiftTiming === 'NOW' ? 'Đã nhận & đang đầu tư' : 'Nhận khi mua nhà'}
                      </span>
                    </div>
                     <div className="p-3 bg-slate-800/60 rounded-md mt-2 text-slate-300 leading-relaxed">
                       Đây là khoản hỗ trợ không cần hoàn lại, giúp bạn giảm số tiền cần vay từ ngân hàng và đạt được mục tiêu sớm hơn.
                    </div>
                  </>
                )}
             </CardContent>
           </Card>
        )}
      </div>

      {/* Expert Explanation */}
       <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">Giải thích của chuyên gia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
             <div className="bg-slate-800 p-3 rounded-lg">
              <p className="font-semibold text-slate-100 mb-1">Tại sao giá nhà trung bình tăng {plan.pctHouseGrowth}%/năm?</p>
              <p className="leading-relaxed">{expertExplanation?.reasoningForHouseGrowth || "Do nhu cầu ở cao, đô thị hóa nhanh, chi phí xây dựng tăng và dòng tiền đầu tư liên tục đổ vào bất động sản. Ngoài ra, đây cũng là mức tăng giá ổn định hàng năm, nhất là tại TP.HCM và Hà Nội – nơi quỹ đất khan hiếm và hạ tầng liên tục mở rộng."}</p>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg">
              <p className="font-semibold text-slate-100 mb-1">Tại sao nên vay với lãi suất dưới {plan.loanInterestRate + 1}%/năm?</p>
              <p className="leading-relaxed">{expertExplanation?.reasoningForInterestRate || "Đây là mức lãi suất khá tốt trên thị trường, giúp bạn giảm áp lực trả nợ hàng tháng và nhanh chóng sở hữu căn nhà của riêng mình. Để có mức lãi suất này, bạn cần có điểm tín dụng tốt và thu nhập ổn định."}</p>
            </div>
          </CardContent>
        </Card>

      <AmortizationScheduleSheet 
        isOpen={isAmortizationSheetOpen}
        onOpenChange={setIsAmortizationSheetOpen}
        amortizationData={amortizationSchedule}
        loanAmount={bankLoanAmount}
        interestRate={plan.loanInterestRate}
        loanTerm={plan.loanTermYears}
      />
    </div>
  );
};

export default BorrowingReportTab;
