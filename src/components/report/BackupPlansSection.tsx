"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from "@/actions/utils/formatters";
import { type BackupPlansReportData } from "@/actions/reportSections/backupPlans";
import { ProjectionRow } from "@/lib/calculations/affordability";

type SectionData<T> = T | { error: true; message: string; details: string };

interface BackupPlansSectionProps {
  data: SectionData<BackupPlansReportData>;
}

const BackupPlansSection: React.FC<BackupPlansSectionProps> = ({ data }) => {
  if ('error' in data) {
    return (
      <div className="text-center p-8 bg-slate-900 rounded-lg">
        <p className="text-red-500 font-semibold">Lỗi tải dữ liệu</p>
        <p className="text-slate-400 text-sm mt-2">{data.message}</p>
      </div>
    );
  }

  const { plan, projectionData, expertExplanation, alternativeBackupOptions } = data;

  if (!plan || !projectionData) {
    return <div className="text-center p-8">Dữ liệu không đầy đủ cho tab Dự phòng...</div>;
  }

  const chartYearsData = projectionData.slice(0, 5);

  const efChartData = chartYearsData.map((p: ProjectionRow, index, arr) => {
    const currentTargetEF = Math.round(p.targetEF);
    let previousYearTargetEF = 0;
    if (index > 0) {
      previousYearTargetEF = Math.round(arr[index - 1].targetEF);
    }
    const phanTangLen = currentTargetEF - previousYearTargetEF;
    return {
      name: p.year.toString(),
      "Quỹ dự phòng": index === 0 ? 0 : previousYearTargetEF,
      "Phần tăng lên": index === 0 ? currentTargetEF : phanTangLen,
      "Tổng quỹ dự phòng mục tiêu": currentTargetEF, 
    };
  });

  const backupPlansToDisplay = alternativeBackupOptions || [];

  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={["item-1", "item-2", "item-3"]} className="w-full space-y-3">
        <AccordionItem value="item-1" className="bg-slate-900 rounded-lg border-none">
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100">
            1 | Xây dựng quỹ dự phòng {projectionData[0]?.targetEF ? formatCurrency(projectionData[0].targetEF) : (plan?.initialSavingsGoal ? formatCurrency(plan.initialSavingsGoal) : 'N/A')}
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3">
            <p className="leading-relaxed">
              Trong kế hoạch đã có một quỹ dự phòng tương đương 6 tháng chi tiêu của gia đình bạn. Giá trị của quỹ dự phòng cũng cần tăng qua thời gian do chi tiêu tăng:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              {chartYearsData.map((p: ProjectionRow) => (
                <li key={p.year}>Năm {p.year}: {formatCurrency(p.targetEF)} triệu VNĐ</li>
              ))}
            </ul>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={efChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="name" tick={{ fill: '#cbd5e1' }} />
                  <YAxis tick={{ fill: '#cbd5e1' }} />
                  <Tooltip
                    formatter={(value: number, name: string, props) => {
                      if (name === "Phần tăng lên") {
                        return [`${value.toLocaleString()} triệu`, name];
                      }
                      // For "Quỹ dự phòng", show the total target EF for that year from the payload
                      if (name === "Quỹ dự phòng" && props.payload && props.payload["Tổng quỹ dự phòng mục tiêu"] !== undefined) {
                         // Only show if it's not the base part of the first bar (which is 0)
                        if (props.payload["Quỹ dự phòng"] === 0 && props.payload.name === efChartData[0].name) {
                           return null; // Don't show tooltip for the 0 base of the first bar
                        }
                        return [`${props.payload["Tổng quỹ dự phòng mục tiêu"].toLocaleString()} triệu`, "Tổng quỹ mục tiêu"];
                      }
                      return [`${value.toLocaleString()} triệu`, name];
                    }}
                    contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="Quỹ dự phòng" stackId="a" fill="rgba(34, 211, 238, 0.3)" radius={[4, 4, 0, 0]} name="Quỹ dự phòng" />
                  <Bar dataKey="Phần tăng lên" stackId="a" fill="#22D3EE" radius={[4, 4, 0, 0]} name="Phần tăng lên" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2" className="bg-slate-900 rounded-lg border-none">
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100">
            2 | Tìm kiếm phương án dự phòng thay thế
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3">
            <p className="leading-relaxed">
              Ngoài quỹ dự phòng, bạn cũng cần chuẩn bị một số phương án thay thế trong trường hợp rủi ro liên quan tới rủi ro tài chính quá lớn, vượt quá khả năng bảo vệ của quỹ dự phòng.
            </p>
            <div className="space-y-3 grid grid-cols-1 gap-3">
              {backupPlansToDisplay.map((rec, index) => (
                <div key={index} className="bg-slate-800 p-3 rounded-lg"> {/* Consistent padding p-3 */}
                  <h4 className="font-semibold text-xs sm:text-sm text-slate-100 mb-1">{rec.title}</h4>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{rec.description}</p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3" className="bg-slate-900 rounded-lg border-none">
          <AccordionTrigger className="hover:no-underline text-sm font-semibold p-4 text-left text-slate-100 data-[state=open]:text-cyan-400">
            Giải thích của chuyên gia
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 text-slate-300 text-xs sm:text-sm space-y-3">
            <div className="bg-slate-800 p-3 rounded-lg">
              <p className="font-semibold text-slate-100 mb-1">Tại sao cần xây dựng quỹ dự phòng?</p>
              <p className="leading-relaxed">{expertExplanation?.whyEmergencyFund || "Quỹ dự phòng là một khoản tiền quan trọng để đối phó với các tình huống khẩn cấp."}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default BackupPlansSection;
