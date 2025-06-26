"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { RepaymentScheduleSection } from './RepaymentScheduleSection';
import { 
  CapitalStructureReportData, 
  CapitalStructureError
} from '@/actions/reportSections/capitalStructure';
import { Plan } from "@prisma/client";

interface Annotation {
  text: string;
  description: string;
}

// Use a more specific type for the plan prop
type CapitalStructureSectionProps = {
  data: CapitalStructureReportData | CapitalStructureError;
  plan: Plan & { paymentMethod?: "fixed" | "decreasing" };
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-slate-800 border border-slate-700 rounded-md">
        <p className="label">{`${payload[0].name} : ${payload[0].value.toLocaleString()} triệu`}</p>
      </div>
    );
  }
  return null;
};

export const CapitalStructureSection = ({ data, plan }: CapitalStructureSectionProps) => {
  if ('error' in data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lỗi</CardTitle>
          <CardDescription>Không thể tạo mục này</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{data.message}</p>
          <pre className="text-xs text-red-400">{data.details}</pre>
        </CardContent>
      </Card>
    );
  }

  const { currentSituation, expertExplanation, recommendations, amortizationSchedule, familyLoanDetails } = data;
  const paymentMethod = plan.paymentMethod || 'fixed';
  
  // Expanded colors for the three-part donut chart
  const COLORS = ['#0088FE', '#FF8042', '#00C49F']; // Blue: Equity, Orange: Bank Loan, Green: Family Loan

  // Prepare legend and chart data
  const chartData = currentSituation.donutChart.filter(item => item.value > 0);
  
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Tính tối ưu của cấu trúc vốn</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Section 1: Current Situation */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1 | Báo cáo tình hình hiện tại</h2>
            
            <p className="mb-6">{currentSituation.introText}</p>
            
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Donut Chart */}
              <div className="w-full md:w-1/2 h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Annotations */}
                <div className="absolute top-0 right-0 text-sm">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-[#0088FE] mr-2"></div>
                    <span>Vốn tự có</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-[#FF8042] mr-2"></div>
                    <span>Vốn vay</span>
                  </div>
                </div>
              </div>
              
              {/* Text Annotations */}
              <div className="w-full md:w-1/2">
                <ul className="space-y-4">
                  {currentSituation.annotations.map((annotation: Annotation, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="font-bold mr-2">{annotation.text}:</span>
                      <span>{annotation.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Section 2: Expert Explanation */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2 | Giải thích của chuyên gia</h2>
            
            <h3 className="text-lg font-medium mb-3">{expertExplanation.heading}</h3>
            
            <p className="mb-3">{expertExplanation.intro}</p>
            
            <ul className="list-disc list-inside space-y-2 mb-4">
              {expertExplanation.explanationPoints.map((point: string, index: number) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
            
            <div className="bg-slate-800 p-4 rounded-lg">
              <p>{expertExplanation.warning}</p>
            </div>
          </div>
          
          {/* Section 3: Recommendations */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3 | Khuyến nghị của chuyên gia</h2>
            
            <ul className="space-y-4">
              <li>
                <span className="font-medium">Thời gian vay:</span> {recommendations.loanTerm.years} năm
              </li>
              <li>
                <span className="font-medium">Lãi suất vay:</span> {recommendations.interestRate}% / năm <span className="text-slate-400 text-sm">({recommendations.note})</span>
              </li>
            </ul>
          </div>
          
          {/* Section 4: Repayment Schedule */}
          {amortizationSchedule && (
            <div>
              <h2 className="text-xl font-semibold mb-4">4 | Lịch trả nợ gốc và lãi dự kiến</h2>
              <CardDescription>
                Bảng dưới đây minh họa chi tiết lịch trả nợ hàng tháng và hàng năm của bạn
                {paymentMethod === 'fixed' 
                  ? ` với khoản trả góp cố định là ${amortizationSchedule.summary.monthlyPayment.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}/tháng.`
                  : ` với khoản trả góp tháng đầu tiên là ${amortizationSchedule.summary.monthlyPayment.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })} và giảm dần theo từng tháng.`
                }
              </CardDescription>
              <RepaymentScheduleSection
                amortizationSchedule={amortizationSchedule}
                familyLoanDetails={familyLoanDetails}
                loanTermYears={recommendations.loanTerm.years}
                paymentMethod={paymentMethod}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
