"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { type AssetEfficiencyReportData } from "@/actions/reportSections/assetEfficiency";
import { ProjectionRow } from "@/lib/calculations/affordability";

// A generic type for section data that can either be the data or an error
type SectionData<T> = T | { error: true; message: string; details: string };

interface AccumulationReportTabProps {
  data: SectionData<AssetEfficiencyReportData>; 
}

// Helper to format currency for charts and text
// const formatMillions = (value: number): string => { // Removed as YAxis will show raw numbers
//   if (isNaN(value) || value === null || value === undefined) return "0tr";
//   return `${(value / 1000000).toFixed(1)}tr`;
// };
const formatTooltipCurrency = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) return "0 triệu";
  return `${Math.round(value).toLocaleString()} triệu`;
};
// Moved formatCurrency here for now
const formatCurrency = (value: number | undefined | null, unit = "triệu VNĐ"): string => {
  if (value === undefined || value === null || isNaN(value)) return `N/A ${unit}`;
  return `${Math.round(value).toLocaleString()} ${unit}`;
};


const AccumulationReportTab: React.FC<AccumulationReportTabProps> = ({ data }) => {
  // Handle error case first
  if ('error' in data) {
    return (
      <div className="text-center p-8 bg-slate-900 rounded-lg">
        <p className="text-red-500 font-semibold">Lỗi tải dữ liệu</p>
        <p className="text-slate-400 text-sm mt-2">{data.message}</p>
      </div>
    );
  }
  
  // Now we know data is AssetEfficiencyReportData
  const { 
    plan, 
    projectionData, 
    salaryGrowthExplanation, 
    investmentReturnExplanation 
  } = data;
  
  if (!plan || !projectionData) {
    return <div className="text-center p-8">Dữ liệu không đầy đủ cho tab Tích lũy.</div>;
  }

  const confirmedYear = plan.confirmedPurchaseYear || new Date().getFullYear() + plan.yearsToPurchase;
  const confirmedYearData = projectionData.find((p) => p.year === confirmedYear);

  // Data for Income Chart (Thu nhập chính vs Thu nhập khác)
  const incomeChartData = projectionData
    .slice(0, 5)
    .map((p: ProjectionRow) => ({
      name: p.year.toString(),
      "Thu nhập chính": Math.round(p.primaryIncome / 12), // Monthly
      "Thu nhập khác": Math.round(p.otherIncome / 12), // Monthly
      "Tổng Thu Nhập": Math.round(p.annualIncome / 12), // Monthly
    }));

  // Data for Savings Chart (Tiền tích lũy mỗi năm)
  const savingsChartData = projectionData
    .slice(0, 5)
    .map((p: ProjectionRow) => ({
      name: p.year.toString(),
      "Tiền tích lũy": Math.round(p.annualSavings), // Annual
      "Tổng tích lũy": Math.round(p.cumulativeSavings), // Cumulative Annual
    }));

  const targetSalaryGrowth = plan.pctSalaryGrowth;
  const targetInvestmentReturn = plan.pctInvestmentReturn;
  
  return (
    <div className="space-y-6">
      {/* "MỤC TIÊU TÍCH LŨY" Card removed, will be handled by ReportHeaderCard in parent */}
      <Accordion type="multiple" defaultValue={["item-1", "item-2", "item-3"]} className="w-full space-y-3"> {/* Auto open accordion */}
        {/* Mục 1: Tăng lương */}
        <AccordionItem value="item-1" className="bg-slate-900 rounded-lg border-none"> {/* Changed to bg-slate-900 */}
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100"> {/* Adjusted styles */}
            1 | Tăng lương với tốc độ trung bình {targetSalaryGrowth}%/năm
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3"> {/* Adjusted styles */}
            <p className="leading-relaxed">
              Bạn cần tăng thu nhập chính bằng cách tăng lương trung bình {targetSalaryGrowth}%/năm cho tới thời điểm mua nhà ({confirmedYear}), 
              đồng thời duy trì ổn định nguồn thu nhập khác mà bạn đang có (nếu có).
            </p>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                {/* Adjusted margins for symmetry: left and right are now both 10 */}
                <BarChart data={incomeChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="name" tick={{ fill: '#cbd5e1' }} />
                  {/* YAxis now shows raw numbers (data is in millions) */}
                  <YAxis tick={{ fill: '#cbd5e1' }} /> 
                  <Tooltip 
                    formatter={(value: number) => formatTooltipCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                    itemStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                  <Bar dataKey="Thu nhập chính" stackId="a" fill="#00ACB8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Thu nhập khác" stackId="a" fill="#FFC344" radius={[4, 4, 0, 0]} /> {/* Yellow for other income */}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Mục 2: Đầu tư */}
        <AccordionItem value="item-2" className="bg-slate-900 rounded-lg border-none"> {/* Changed to bg-slate-900 */}
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100"> {/* Adjusted styles */}
            2 | Đầu tư với lợi nhuận {targetInvestmentReturn}%/năm
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3"> {/* Adjusted styles */}
            <p className="leading-relaxed">
              Ngay khi bắt đầu kế hoạch mua nhà, bạn cần đảm bảo khoản tích lũy hiện có ({formatCurrency(plan.initialSavingsGoal)}) được đầu tư với lợi nhuận {targetInvestmentReturn}%/năm. 
              Bên cạnh đó, sau khi chi tiêu hàng tháng và còn dư tiền, bạn cũng cần đem tiền đó đi đầu tư.
            </p>
            <p className="leading-relaxed">
              Cho tới năm {confirmedYear}, bạn tích lũy được tổng cộng {formatCurrency(confirmedYearData?.cumulativeSavings)}.
            </p>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={savingsChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="name" tick={{ fill: '#cbd5e1' }} />
                  {/* YAxis now shows raw numbers (data is in millions) */}
                  <YAxis tick={{ fill: '#cbd5e1' }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => name === "Tổng tích lũy" ? formatTooltipCurrency(value) : formatTooltipCurrency(value) + " (năm đó)"}
                    contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                  <Bar dataKey="Tổng tích lũy" fill="#22D3EE" radius={[4, 4, 0, 0]} name="Tổng tích lũy đến cuối năm" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Mục 3: Giải thích của chuyên gia */}
        <AccordionItem value="item-3" className="bg-slate-900 rounded-lg border-none"> {/* Changed to bg-slate-900 */}
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100 data-[state=open]:text-cyan-500">
            Giải thích của chuyên gia
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3">
            <div className="bg-slate-800 p-3 rounded-lg">
              <p className="font-semibold text-slate-100 mb-1">Tại sao cần tăng lương ít nhất 7%/năm?</p>
              <p className="leading-relaxed">{salaryGrowthExplanation || "Tiền lương là khoản thu đóng góp rất lớn vào tích lũy hàng năm, vì vậy cần tăng trưởng lương để giúp sở hữu căn nhà đầu tiên sớm hơn. Con số 7% được tính toán dựa trên mức tăng lương trung bình của người lao động."}</p>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg">
              <p className="font-semibold text-slate-100 mb-1">Tại sao cần tích lũy ít nhất 11%/năm?</p>
              <p className="leading-relaxed">{investmentReturnExplanation || "Tốc độ tăng giá nhà trung bình là 10%/năm, vì vậy bạn cần đầu tư với tỷ suất sinh lời cao hơn tốc độ tăng giá, ít nhất là 11%/năm."}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {/* "Tiếp tục" button removed as navigation is handled by main tabs */}
    </div>
  );
};

export default AccumulationReportTab;
