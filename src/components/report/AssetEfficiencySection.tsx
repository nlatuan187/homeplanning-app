"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AssetEfficiencySectionProps {
  data: any;
}

export const AssetEfficiencySection: React.FC<AssetEfficiencySectionProps> = ({ data }) => {
  // Handle error state
  if (data.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hiệu quả Danh mục Tài sản</CardTitle>
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
  const { currentSituation, goalProposal, recommendations } = data;
  
  // Colors for the donut chart
  const COLORS = ['#00C49F', '#0088FE'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hiệu quả Danh mục Tài sản</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Section 1: Current Situation */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1 | Báo cáo tình hình hiện tại</h2>
          
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
                  <Tooltip formatter={(value) => `${value} triệu VNĐ`} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Annotations */}
              <div className="absolute top-0 right-0 text-sm">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-[#00C49F] mr-2"></div>
                  <span>Quỹ dự phòng</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-[#0088FE] mr-2"></div>
                  <span>Tiết kiệm Mua nhà</span>
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
        
        {/* Section 2: Goal Proposal */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2 | Đề xuất mục tiêu</h2>
          
          <p className="mb-4">
            Đến năm {goalProposal.targetYear} ({goalProposal.yearsToPurchase} năm nữa), bạn sẽ cần tích lũy {goalProposal.targetSavings} triệu, tương đương {goalProposal.targetPercentage}% giá trị căn nhà.
          </p>
          
          <p className="mb-6">
            Dựa trên số tiền tích lũy hiện tại là {goalProposal.currentSavings} triệu, cộng với quá trình tích lũy và đầu tư suất đầu tư hàng năm là {goalProposal.investmentRate}%, thì sau {goalProposal.yearsToPurchase} năm, bạn sẽ tích lũy được {goalProposal.targetSavings} triệu.
          </p>
          
          {/* Side-by-side boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Situation Box */}
            <div className="border border-slate-700 rounded-lg p-4">
              <h3 className="text-center font-medium mb-2">Hiện tại ({goalProposal.current.year})</h3>
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Vốn tự có', value: goalProposal.current.percentage },
                          { name: 'Còn thiếu', value: 100 - goalProposal.current.percentage }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={35}
                        fill="#8884d8"
                        paddingAngle={0}
                        dataKey="value"
                      >
                        <Cell fill="#0088FE" />
                        <Cell fill="#EEEEEE" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{goalProposal.current.percentage}%</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="mb-1">Giá trị căn nhà: {goalProposal.current.housePrice} triệu VNĐ</p>
                <p>Số tiền bạn tích lũy: {goalProposal.current.savings} triệu VNĐ</p>
                <p className="text-sm text-slate-400">~ {goalProposal.current.percentage}% giá trị căn nhà</p>
              </div>
            </div>
            
            {/* Target Situation Box */}
            <div className="border border-slate-700 rounded-lg p-4">
              <h3 className="text-center font-medium mb-2">Thời điểm mua nhà ({goalProposal.target.year})</h3>
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Vốn tự có', value: goalProposal.target.percentage },
                          { name: 'Còn thiếu', value: 100 - goalProposal.target.percentage }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={35}
                        fill="#8884d8"
                        paddingAngle={0}
                        dataKey="value"
                      >
                        <Cell fill="#0088FE" />
                        <Cell fill="#EEEEEE" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{goalProposal.target.percentage}%</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="mb-1">Giá trị căn nhà: {goalProposal.target.housePrice} triệu VNĐ</p>
                <p>Số tiền bạn tích lũy: {goalProposal.target.savings} triệu VNĐ</p>
                <p className="text-sm text-slate-400">~ {goalProposal.target.percentage}% giá trị căn nhà</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Section 3: Recommendations */}
        <div>
          <h2 className="text-xl font-semibold mb-4">3 | Khuyến nghị & Giải thích</h2>
          
          <p className="mb-2">
            <span className="font-medium">Khuyến nghị tỷ suất đầu tư mỗi năm:</span> {recommendations.investmentRate}%
          </p>
          
          <p className="mb-4">
            <span className="font-medium">Lý do:</span> {recommendations.reasoning}
          </p>
          
          {/* Savings Projection Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="py-2 px-1 text-left">Năm</th>
                  <th className="py-2 px-1 text-right">Số tiền tích lũy</th>
                  <th className="py-2 px-1 text-right">Tỷ suất đầu tư</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.savingsProjections.map((row: any, index: number) => (
                  <tr key={index} className="border-b border-slate-800">
                    <td className="py-2 px-1">{row.year}</td>
                    <td className="py-2 px-1 text-right">{row.cumulativeSavings} triệu VNĐ</td>
                    <td className="py-2 px-1 text-right">{row.investmentRate}%</td>
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
