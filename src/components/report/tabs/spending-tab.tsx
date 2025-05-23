"use client";

import { Plan } from "@prisma/client";
import { ProjectionRow } from "@/lib/calculations/affordability";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button"; 
import { useState } from "react";
import { type SpendingPlanReportData } from "@/actions/reportSections/spendingPlan"; // Use path alias

// The local SpendingPlanData interface has been removed.
// SpendingPlanReportData (imported) is now used for the reportData prop.

interface SpendingReportTabProps {
  plan: Plan | null;
  projectionData: ProjectionRow[] | null;
  reportData: SpendingPlanReportData | null; // Use imported type
  setActiveTab: (tab: string) => void; // Function to switch tabs
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

const SpendingReportTab: React.FC<SpendingReportTabProps> = ({ plan, projectionData, reportData, setActiveTab }) => {
  const [chartView, setChartView] = useState<'monthly' | 'annual'>('monthly'); // Moved hook to top level

  if (!plan || !projectionData) {
    return <div className="text-center p-8">Đang tải dữ liệu cho tab Chi tiêu...</div>;
  }

  // const confirmedYear = plan.confirmedPurchaseYear || new Date().getFullYear() + plan.yearsToPurchase; // confirmedYear is not used in this tab currently

  // Data for Expenses Chart
  const expensesChartData = projectionData.slice(0, 5).map(p => {
    // "Chi tiêu (không bảo hiểm)" is the base p.annualExpenses for this calculation
    const baseAnnualExpenses = p.annualExpenses; 
    // const annualInsuranceCalculated = baseAnnualExpenses * 0.125; // This was for an intermediate step, not directly used below

    // const monthlyBaseExpenses = Math.round(baseAnnualExpenses / 12); // Unused
    // const monthlyInsuranceCalculated = Math.round(annualInsuranceCalculated / 12); // Unused

    return {
      name: p.year.toString(),
      // For the chart, "Chi tiêu (không bảo hiểm)" will be the part that is NOT the calculated insurance.
      // However, the design shows "Chi tiêu (không bảo hiểm)" and "Phí bảo hiểm" as stacked components
      // implying "Chi tiêu (không bảo hiểm)" is the larger part.
      // Let's assume "Chi tiêu (không bảo hiểm)" is the original p.annualExpenses,
      // and "Phí bảo hiểm" is an *additional* 12.5% on top for display, or rather, a portion OF it.
      // Based on "Phí bảo hiểm is 12.5% of Chi tiêu (Không bảo hiểm)", it means:
      // Let X = Chi tiêu (Không bảo hiểm)
      // Phí bảo hiểm = 0.125 * X
      // Total Displayed Expense in chart = X + 0.125X = 1.125X.
      // This seems to inflate the total expense.
      //
      // Alternative interpretation: p.annualExpenses is the TOTAL.
      // Phí bảo hiểm = 0.125 * (Chi tiêu không BH)
      // Chi tiêu không BH + Phí bảo hiểm = p.annualExpenses
      // Chi tiêu không BH + 0.125 * Chi tiêu không BH = p.annualExpenses
      // 1.125 * Chi tiêu không BH = p.annualExpenses
      // Chi tiêu không BH = p.annualExpenses / 1.125
      // Phí bảo hiểm = p.annualExpenses - (p.annualExpenses / 1.125)
      // This interpretation seems more aligned with p.annualExpenses being the total.

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
      {/* "MỤC TIÊU CHI TIÊU" Card removed, will be handled by ReportHeaderCard in parent */}
      <Accordion type="multiple" defaultValue={["item-1", "item-2", "item-3"]} className="w-full space-y-3"> {/* Auto open accordion */}
        {/* Mục 1: Không tăng chi tiêu quá X% */}
        <AccordionItem value="item-1" className="bg-slate-900 rounded-lg border-none"> {/* Changed to bg-slate-900 */}
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100"> {/* Adjusted styles */}
            1 | Không tăng chi tiêu quá {targetExpenseGrowth}%/năm
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3"> {/* Adjusted styles */}
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
        <AccordionItem value="item-2" className="bg-slate-900 rounded-lg border-none"> {/* Changed to bg-slate-900 */}
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100"> {/* Adjusted styles */}
            2 | Kỷ luật trong chi tiêu hàng tháng
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3"> {/* Adjusted styles & space-y-3 */}
            <div className="bg-slate-800 p-3 rounded-md"> {/* Changed to bg-slate-800 */}
              <p className="leading-relaxed">- Duy trì mức chi tiêu trung bình qua các tháng, không phát sinh thêm mục tiêu tài chính quá lớn (mua xe,...) để đảm bảo mục tiêu mua nhà không bị ảnh hưởng.</p>
            </div>
            <div className="bg-slate-800 p-3 rounded-md"> {/* Changed to bg-slate-800 */}
              <p className="leading-relaxed">- Tính toán những khoản chi đột xuất vào chi tiêu trung bình để không ảnh hưởng tới kết quả mua được nhà.</p>
            </div>
            <div className="bg-slate-800 p-3 rounded-md"> {/* Changed to bg-slate-800 */}
              <p className="leading-relaxed">- Đảm bảo kế hoạch chi tiêu bằng cách gia tăng thêm thu nhập, cân đối lại giữa các khoản thu/chi đột xuất.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Mục 3: Giải thích của chuyên gia */}
        <AccordionItem value="item-3" className="bg-slate-900 rounded-lg border-none"> {/* Changed to bg-slate-900 */}
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100 data-[state=open]:text-cyan-400">
            Giải thích của chuyên gia
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3">
            <div className="bg-slate-800 p-3 rounded-lg">
              <p className="font-semibold text-slate-100 mb-1">Tại sao chi nên tăng {targetExpenseGrowth}%/năm?</p>
              <p className="leading-relaxed">{reportData?.expertExplanation?.expenseGrowthExplanation || "Vì đây là mức gần bằng lạm phát của Việt Nam, giúp bạn giữ vững mức sống mà không tiêu hết phần thu nhập tăng thêm. Nhờ vậy, bạn vẫn còn dư để tiết kiệm và tích lũy cho mục tiêu mua nhà."}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {/* "Tiếp tục" button removed as navigation is handled by main tabs */}
    </div>
  );
};

export default SpendingReportTab;
