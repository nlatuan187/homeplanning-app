"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  SpendingPlanReportData, 
  SpendingPlanError,
  IncomeProjectionItem,
  ExpenseProjectionItem,
  SpendingRatioProjectionItem,
} from '@/actions/reportSections/spendingPlan';
import { formatNumber } from '@/actions/utils/formatters';

interface SpendingPlanSectionProps {
  data: SpendingPlanReportData | SpendingPlanError;
}

export const SpendingPlanSection: React.FC<SpendingPlanSectionProps> = ({ data }) => {
  // Handle error state
  if ('error' in data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tính hợp lý của kế hoạch chi tiêu</CardTitle>
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
  const { currentSituation, expertExplanation, recommendations } = data;
  const { income, expenses, monthlySurplus, mortgageToIncomeRatio } = currentSituation;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tính hợp lý của kế hoạch chi tiêu</CardTitle>
        <CardDescription>Phân tích thu nhập, chi phí và khả năng tiết kiệm của bạn theo thời gian.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Section 1: Current Situation */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1 | Tình hình tại năm mua nhà</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Thu nhập hàng tháng</h3>
              <p className="text-2xl font-bold">{formatNumber(income.monthlyIncome)} triệu</p>
              <p className="text-sm text-slate-400">Tăng {income.growthRate}% mỗi năm</p>
            </div>
            
            <div className="bg-slate-800 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Chi phí hàng tháng</h3>
              <p className="text-2xl font-bold">{formatNumber(expenses.monthlyExpenses)} triệu</p>
              <p className="text-sm text-slate-400">Tăng {expenses.growthRate}% mỗi năm</p>
            </div>
            
            <div className="bg-slate-800 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Tiết kiệm ròng hàng tháng</h3>
              <p className="text-2xl font-bold">{formatNumber(monthlySurplus)} triệu</p>
              <p className="text-sm text-slate-400">Tỷ lệ trả góp ngân hàng/thu nhập: {mortgageToIncomeRatio}%</p>
            </div>
          </div>
          
          {/* Income Projection Table */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Dự báo Thu nhập (triệu VNĐ)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="py-2 px-1 text-left">Năm</th>
                    <th className="py-2 px-1 text-right">Tổng thu nhập</th>
                    <th className="py-2 px-1 text-right">Thu nhập cá nhân</th>
                    <th className="py-2 px-1 text-right">Thu nhập vợ/chồng</th>
                    <th className="py-2 px-1 text-right">Thu nhập khác</th>
                  </tr>
                </thead>
                <tbody>
                  {income.projections.map((row: IncomeProjectionItem, index: number) => (
                    <tr key={index} className="border-b border-slate-800">
                      <td className="py-2 px-1">{row.year}</td>
                      <td className="py-2 px-1 text-right">{formatNumber(row.totalIncome)}</td>
                      <td className="py-2 px-1 text-right">{formatNumber(row.personalIncome)}</td>
                      <td className="py-2 px-1 text-right">{formatNumber(row.spouseIncome)}</td>
                      <td className="py-2 px-1 text-right">{formatNumber(row.otherIncome)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Expense Projection Table */}
          <div>
            <h3 className="font-medium mb-3">Dự báo Chi phí (triệu VNĐ)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="py-2 px-1 text-left">Năm</th>
                    <th className="py-2 px-1 text-right">Tổng chi</th>
                    <th className="py-2 px-1 text-right">% tăng trưởng chi</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.projections.map((row: ExpenseProjectionItem, index: number) => (
                    <tr key={index} className="border-b border-slate-800">
                      <td className="py-2 px-1">{row.year}</td>
                      <td className="py-2 px-1 text-right">{formatNumber(row.totalExpense)}</td>
                      <td className="py-2 px-1 text-right">{row.growthPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Section 2: Expert Explanation */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2 | Giải thích của chuyên gia</h2>
          
          <div className="bg-slate-800 p-4 rounded-lg">
            <p>{expertExplanation.expenseGrowthExplanation}</p>
          </div>
        </div>
        
        {/* Section 3: Recommendations */}
        <div>
          <h2 className="text-xl font-semibold mb-4">3 | Khuyến nghị của chuyên gia</h2>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Tỷ lệ chi tiêu trên thu nhập</h3>
            <p>Năm mua nhà: <span className="font-bold">{recommendations.spendingRatio.confirmedYearRatio}%</span></p>
            <p className="text-sm text-slate-400 mt-1">
              Trong đó, tỷ lệ trả góp ngân hàng trên thu nhập là {recommendations.spendingRatio.mortgageRatio}%. 
              Tỷ lệ này cho thấy bạn có đủ khả năng chi trả cho khoản vay mua nhà một cách an toàn.
            </p>
          </div>
          
          {/* Spending Ratio Projection Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="py-2 px-1 text-left">Năm</th>
                  <th className="py-2 px-1 text-right">Thu nhập</th>
                  <th className="py-2 px-1 text-right">Chi phí</th>
                  <th className="py-2 px-1 text-right">Tỷ lệ chi tiêu</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.spendingRatio.projections.map((row: SpendingRatioProjectionItem, index: number) => (
                  <tr key={index} className="border-b border-slate-800">
                    <td className="py-2 px-1">{row.year}</td>
                    <td className="py-2 px-1 text-right">{formatNumber(row.totalIncome)}</td>
                    <td className="py-2 px-1 text-right">{formatNumber(row.totalExpense)}</td>
                    <td className="py-2 px-1 text-right">{row.spendingRatio}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
