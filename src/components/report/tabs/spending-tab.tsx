"use client";

import { ProjectionRow } from "@/lib/calculations/affordability";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button"; 
import { useState } from "react";
import { type SpendingPlanReportData } from "@/actions/reportSections/spendingPlan"; 

type SectionData<T> = T | { error: true; message: string; details: string };

interface SpendingReportTabProps {
  data: SectionData<SpendingPlanReportData>;
  setActiveTab: (tab: string) => void;
}

// Helper functions (can be moved to utils)
// const formatMillions = (value: number): string => { // Removed as YAxis will show raw numbers
//   if (isNaN(value) || value === null || value === undefined) return "0tr";
//   return `${(value / 1000000).toFixed(1)}tr`;
// };
const formatTooltipCurrency = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) return "0 triệu";
  return `${Math.round(value).toLocaleString()} triệu`;
};

const SpendingReportTab: React.FC<SpendingReportTabProps> = ({ data, setActiveTab }) => {
  const [chartView, setChartView] = useState<'monthly' | 'annual'>('monthly');

  if ('error' in data) {
    return (
      <div className="text-center p-8 bg-slate-900 rounded-lg">
        <p className="text-red-500 font-semibold">Lỗi tải dữ liệu</p>
        <p className="text-slate-400 text-sm mt-2">{data.message}</p>
      </div>
    );
  }

  const { plan, projectionData, expertExplanation } = data;

  if (!plan || !projectionData) {
    return <div className="text-center p-8">Dữ liệu không đầy đủ cho tab Chi tiêu.</div>;
  }
  
  const expensesChartData = projectionData.slice(0, 5).map((p: ProjectionRow) => {
    const baseAnnualExpenses = p.annualExpenses; 
    return {
      name: p.year.toString(),
      "Chi tiêu (không bảo hiểm)": chartView === 'monthly' 
        ? Math.round((baseAnnualExpenses / 1.125) / 12) 
        : Math.round(baseAnnualExpenses / 1.125),
      "Phí bảo hiểm": chartView === 'monthly' 
        ? Math.round((baseAnnualExpenses - (baseAnnualExpenses / 1.125)) / 12) 
        : Math.round(baseAnnualExpenses - (baseAnnualExpenses / 1.125)),
    };
  });

  const targetExpenseGrowth = plan.pctExpenseGrowth;

  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={["item-1", "item-2", "item-3"]} className="w-full space-y-3">
        {/* Mục 1: Không tăng chi tiêu quá X% */}
        <AccordionItem value="item-1" className="bg-slate-900 rounded-lg border-none">
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100">
            1 | Không tăng chi tiêu quá {targetExpenseGrowth}%/năm
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3">
            <p className="leading-relaxed">
              Bạn cần giữ vững kỷ luật chi tiêu, không tăng quá {targetExpenseGrowth}%/năm. 
              Chúng tôi cũng bổ sung một khoản chi mới là phí để mua bảo hiểm hàng năm.
            </p>
            <Button variant="link" onClick={() => setActiveTab("bao-ve")} className="text-cyan-400 p-0 h-auto hover:text-cyan-300">
              Xem thêm bảo vệ →
            </Button>
            <div className="my-4 flex justify-end space-x-2">
              <Button size="sm" variant={chartView === 'monthly' ? 'default' : 'outline'} onClick={() => setChartView('monthly')}>Tháng</Button>
              <Button size="sm" variant={chartView === 'annual' ? 'default' : 'outline'} onClick={() => setChartView('annual')}>Năm</Button>
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={expensesChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="name" tick={{ fill: '#cbd5e1' }} />
                  {/* YAxis now shows raw numbers (data is in millions) */}
                  <YAxis tick={{ fill: '#cbd5e1' }} />
                  <Tooltip 
                    formatter={(value: number) => formatTooltipCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                  <Bar dataKey="Chi tiêu (không bảo hiểm)" stackId="a" fill="#00ACB8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Phí bảo hiểm" stackId="a" fill="#FFC344" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Mục 2: Kỷ luật trong chi tiêu */}
        <AccordionItem value="item-2" className="bg-slate-900 rounded-lg border-none">
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100">
            2 | Kỷ luật trong chi tiêu hàng tháng
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3">
            <div className="bg-slate-800 p-3 rounded-md">
              <p className="leading-relaxed">- Duy trì mức chi tiêu trung bình qua các tháng, không phát sinh thêm mục tiêu tài chính quá lớn (mua xe,...) để đảm bảo mục tiêu mua nhà không bị ảnh hưởng.</p>
            </div>
            <div className="bg-slate-800 p-3 rounded-md">
              <p className="leading-relaxed">- Tính toán những khoản chi đột xuất vào chi tiêu trung bình để không ảnh hưởng tới kết quả mua được nhà.</p>
            </div>
            <div className="bg-slate-800 p-3 rounded-md">
              <p className="leading-relaxed">- Đảm bảo kế hoạch chi tiêu bằng cách gia tăng thêm thu nhập, cân đối lại giữa các khoản thu/chi đột xuất.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Mục 3: Giải thích của chuyên gia */}
        <AccordionItem value="item-3" className="bg-slate-900 rounded-lg border-none">
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100 data-[state=open]:text-cyan-400">
            Giải thích của chuyên gia
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3">
            <div className="bg-slate-800 p-3 rounded-lg">
              <p className="font-semibold text-slate-100 mb-1">Tại sao chi nên tăng {targetExpenseGrowth}%/năm?</p>
              <p className="leading-relaxed">{expertExplanation?.expenseGrowthExplanation || "Vì đây là mức gần bằng lạm phát của Việt Nam, giúp bạn giữ vững mức sống mà không tiêu hết phần thu nhập tăng thêm. Nhờ vậy, bạn vẫn còn dư để tiết kiệm và tích lũy cho mục tiêu mua nhà."}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default SpendingReportTab;
