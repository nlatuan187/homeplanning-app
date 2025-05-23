"use client";

import { Plan } from "@prisma/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatCurrency } from "@/actions/utils/formatters";
import React from 'react'; 
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'; // Text import removed

// Define the type for the data coming from generateInsuranceSection action
interface ExpertExplanationItem {
  q: string;
  a: string;
}
interface InsuranceReportDataItem {
  currentInsuranceAmount: number;
  recommendedInsuranceAmount: number;
  coveragePercentage: number; // Value between 0 and 1
  gaugeValue: number; // coveragePercentage * 100
  expertExplanations: ExpertExplanationItem[];
}

interface InsuranceSectionProps {
  plan: Plan | null; // Still needed for some basic plan info if not in reportDataInsurance
  reportDataInsurance: InsuranceReportDataItem | null; 
}

const InsuranceSection: React.FC<InsuranceSectionProps> = ({ plan, reportDataInsurance }) => {
  if (!plan || !reportDataInsurance) { // Check for reportDataInsurance as well
    return <div className="text-center p-8">Đang tải dữ liệu cho tab Bảo vệ...</div>;
  }

  // Use data from reportDataInsurance
  const { 
    currentInsuranceAmount, 
    recommendedInsuranceAmount, 
    coveragePercentage, 
    gaugeValue, 
    expertExplanations 
  } = reportDataInsurance;

  const getCoverageLevelText = () => {
    if (coveragePercentage <= 0.3) return "Yếu";
    if (coveragePercentage <= 0.6) return "Trung bình";
    return "Mạnh";
  };
  const coverageLevelText = getCoverageLevelText();

  // Renaming to legendColorData for clarity and to avoid potential conflicts
  const legendColorData = [
    { minValue: "0", maxValue: "30", code: "#FF5F5F", label: "Yếu (0-30%)" },
    { minValue: "30", maxValue: "60", code: "#FFC344", label: "Trung bình (31-60%)" },
    { minValue: "60", maxValue: "100", code: "#50E3C2", label: "Mạnh (61-100%)" }
  ];

  // Data for Recharts Pie
  const pieChartData = legendColorData.map(item => ({
    name: item.label,
    // value for Recharts Pie is the span of the arc segment
    value: parseFloat(item.maxValue) - parseFloat(item.minValue), 
    color: item.code
  }));

  // expertExplanations now comes from props (reportDataInsurance.expertExplanations)

  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={["item-1", "item-2"]} className="w-full space-y-3">
        <AccordionItem value="item-1" className="bg-slate-900 rounded-lg border-none">
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100">
            1 | Tham gia HBNT trong vòng 10 năm
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3">
            <p className="leading-relaxed">
              Bạn đang mua bảo hiểm với mức phí <span className="font-semibold text-slate-100">{formatCurrency(currentInsuranceAmount)} triệu/năm</span>, nhưng theo nguyên tắc an toàn, mức hợp lý là <span className="font-semibold text-slate-100">{formatCurrency(recommendedInsuranceAmount)} triệu/năm</span>.
            </p>
            <p className="leading-relaxed">
              Hiện tại bạn mới đạt <span className="font-semibold text-slate-100">{Math.round(coveragePercentage * 100)}%</span> mức khuyến nghị - cần tăng thêm để đảm bảo đủ bảo vệ tài chính nếu có rủi ro lớn xảy ra.
            </p>
            
            {/* Adjusted height for compactness */}
            <div className="w-full max-w-xs mx-auto h-28 sm:h-32 md:h-36"> 
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={pieChartData}
                    dataKey="value"
                    cx="50%"
                    cy="100%" // Pivot at bottom center for semi-circle
                    startAngle={180}
                    endAngle={0}
                    innerRadius="65%" // Adjust for thickness
                    outerRadius="100%" // Adjust for thickness
                    paddingAngle={1} // Small padding between segments
                    labelLine={false}
                    // Custom label for the center percentage
                    label={(props: { cx?: number; cy?: number; outerRadius?: number; [key: string]: unknown }) => {
                      const { cx, cy, outerRadius } = props;
                      const numCx = typeof cx === 'number' ? cx : 0;
                      const numCy = typeof cy === 'number' ? cy : 0;
                      const numOuterRadius = typeof outerRadius === 'number' ? outerRadius : 0;

                      // Position text in the visual center of the semi-circle arc.
                      // cy is the bottom-center. outerRadius is the radius of the semi-circle.
                      // The visual center of the arc is roughly cy - outerRadius * 0.5 (halfway up the radius).
                      // Further adjust by a small factor if needed (e.g., * 0.4 or * 0.6)
                      const textYPosition = numCy - numOuterRadius * 0.2; 

                      return (
                        <text
                          x={numCx}
                          y={textYPosition}
                          fill="#FFFFFF"
                          textAnchor="middle"
                          dominantBaseline="middle" // "middle" is often safer than "central"
                          fontSize="20px" // Slightly reduced font size
                          fontWeight="semibold"
                        >
                          {`${Math.round(gaugeValue)}%`}
                        </text>
                      );
                    }}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center text-xs sm:text-sm mt-2 space-y-1">
              <div className="flex justify-center items-center space-x-2 sm:space-x-4">
                {legendColorData.map(item => (
                  <div key={item.label} className="flex items-center space-x-1">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.code }}></span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <p className="font-semibold pt-1">Khả năng bảo vệ: {coverageLevelText}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2" className="bg-slate-900 rounded-lg border-none">
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100 data-[state=open]:text-cyan-400">
            Giải thích của chuyên gia
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3">
            {expertExplanations.map((exp, index) => (
              <div key={index} className="bg-slate-800 p-3 rounded-lg">
                <p className="font-semibold text-slate-100 mb-1">{exp.q}</p>
                <p className="leading-relaxed whitespace-pre-line">{exp.a}</p>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {/* "Các loại bảo hiểm nên có" section removed as per user feedback */}
    </div>
  );
};

export default InsuranceSection;
