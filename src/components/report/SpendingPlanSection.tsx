"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SpendingPlanSectionProps {
  data: any;
}

export const SpendingPlanSection: React.FC<SpendingPlanSectionProps> = ({ data }) => {
  // Handle error state
  if (data.error) {
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
  const { income, expenses, monthlySurplus, paymentToIncomeRatio } = currentSituation;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tính hợp lý của kế hoạch chi tiêu</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Section 1: Current Situation */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1 | Báo cáo tình hình hiện tại</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Thu nhập hàng tháng</h3>
              <p className="text-2xl font-bold">{income.monthlyIncome} triệu VNĐ</p>
              <p className="text-sm text-slate-400">Tăng {income.growthRate}% mỗi năm</p>
            </div>
            
            <div className="bg-slate-800 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Chi phí hàng tháng</h3>
              <p className="text-2xl font-bold">{expenses.monthlyExpenses} triệu VNĐ</p>
              <p className="text-sm text-slate-400">Tăng {expenses.growthRate}% mỗi năm</p>
            </div>
            
            <div className="bg-slate-800 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Tiết kiệm hàng tháng</h3>
              <p className="text-2xl font-bold">{monthlySurplus} triệu VNĐ</p>
              <p className="text-sm text-slate-400">Tỷ lệ trả góp/thu nhập: {paymentToIncomeRatio}%</p>
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
                  {income.projections.map((row: any, index: number) => (
                    <tr key={index} className="border-b border-slate-800">
                      <td className="py-2 px-1">{row.year}</td>
                      <td className="py-2 px-1 text-right">{row.totalIncome}</td>
                      <td className="py-2 px-1 text-right">{row.personalIncome}</td>
                      <td className="py-2 px-1 text-right">{row.spouseIncome}</td>
                      <td className="py-2 px-1 text-right">{row.otherIncome}</td>
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
                  {expenses.projections.map((row: any, index: number) => (
                    <tr key={index} className="border-b border-slate-800">
                      <td className="py-2 px-1">{row.year}</td>
                      <td className="py-2 px-1 text-right">{row.totalExpense}</td>
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
          
          <div className="bg-slate-800 p-4 rounded-lg mb-4">
            <h3 className="font-medium mb-2">Các yếu tố ảnh hưởng đến chi phí</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Tăng chi phí khi kết hôn: {expertExplanation.expenseFactors.factorMarriage}%</li>
              <li>Tăng chi phí khi có con: {expertExplanation.expenseFactors.factorChild}%</li>
              <li>Tỷ lệ tăng chi phí hàng năm: {expertExplanation.expenseFactors.expenseGrowthRate}%</li>
            </ul>
          </div>
          
          <div className="bg-slate-800 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Tỷ lệ tăng lương cần thiết</h3>
            <p>Để theo kịp tốc độ tăng giá nhà ({expertExplanation.requiredSalaryGrowth.houseGrowthRate}%) và đạt được tỷ suất đầu tư mục tiêu ({expertExplanation.requiredSalaryGrowth.investmentReturnRate}%), bạn cần duy trì tốc độ tăng lương ít nhất {expertExplanation.requiredSalaryGrowth.rate}% mỗi năm.</p>
          </div>
        </div>
        
        {/* Section 3: Recommendations */}
        <div>
          <h2 className="text-xl font-semibold mb-4">3 | Khuyến nghị của chuyên gia</h2>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Tỷ lệ chi tiêu/thu nhập</h3>
            <p>Hiện tại: {recommendations.spendingRatio.current}% → Năm mua nhà: {recommendations.spendingRatio.confirmedYear}%</p>
            <p className="text-sm text-slate-400 mt-1">Tỷ lệ trả góp/thu nhập: {recommendations.spendingRatio.mortgageRatio}%</p>
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
                {recommendations.spendingRatio.projections.map((row: any, index: number) => (
                  <tr key={index} className="border-b border-slate-800">
                    <td className="py-2 px-1">{row.year}</td>
                    <td className="py-2 px-1 text-right">{row.totalIncome}</td>
                    <td className="py-2 px-1 text-right">{row.totalExpense}</td>
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
