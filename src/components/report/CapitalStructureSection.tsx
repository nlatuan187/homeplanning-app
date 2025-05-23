"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { RepaymentScheduleSection } from './RepaymentScheduleSection';

interface CapitalStructureSectionProps {
  data: any;
}

export const CapitalStructureSection: React.FC<CapitalStructureSectionProps> = ({ data }) => {
  // Handle error state
  if (data.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tính tối ưu của cấu trúc vốn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-slate-400">{data.message}</p>
            <p className="text-sm text-slate-500 mt-2">{data.details}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract data for rendering
  const { currentSituation, expertExplanation, recommendations, amortizationSchedule } = data;
  
  // Colors for the donut chart
  const COLORS = ['#FF8042', '#0088FE'];

  return (
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
                    data={currentSituation.donutChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={false}
                  >
                    {currentSituation.donutChart.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Annotations */}
              <div className="absolute top-0 right-0 text-sm">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-[#FF8042] mr-2"></div>
                  <span>Vay</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-[#0088FE] mr-2"></div>
                  <span>Vốn tự có</span>
                </div>
              </div>
            </div>
            
            {/* Text Annotations */}
            <div className="w-full md:w-1/2">
              <ul className="space-y-4">
                {currentSituation.annotations.map((annotation: any, index: number) => (
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
              <span className="font-medium">Thời gian vay:</span> {recommendations.loanTerm.years} năm (tương ứng {recommendations.loanTerm.months} tháng)
            </li>
            <li>
              <span className="font-medium">Lãi suất vay:</span> {recommendations.interestRate}% / năm <span className="text-slate-400 text-sm">({recommendations.note})</span>
            </li>
          </ul>
        </div>
        
        {/* Section 4: Repayment Schedule */}
        {amortizationSchedule && (
          <div>
            <h2 className="text-xl font-semibold mb-4">4 | Lịch trả nợ chi tiết</h2>
            <RepaymentScheduleSection
              amortizationSchedule={amortizationSchedule}
              paymentMethod={data.paymentMethod || "fixed"}
              loanAmount={currentSituation.loanAmount}
              loanTermMonths={recommendations.loanTerm.months}
              interestRate={recommendations.interestRate}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
