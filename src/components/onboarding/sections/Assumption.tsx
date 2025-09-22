"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import LoadingStep from "../shared/LoadingStep";
import ProgressBar from "../shared/ProgressBar";
import { ArrowLeftIcon, Home } from "lucide-react";
import AccumulationChart from "@/components/plan/playground/AccumulationChart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Line, ReferenceLine } from 'recharts';
import { ChartMilestone, DataKey } from "@/lib/calculations/projections/generateChartData";
import FinancialSliders from "@/components/plan/playground/FinancialSliders";
import { useUser } from "@clerk/nextjs";
import { OnboardingSectionState, Plan } from "@prisma/client";
import { useRouter } from "next/navigation";
import { updateOnboardingSectionProgress } from "@/actions/onboardingActions";
import { cn } from "@/lib/utils";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value));
};

// --- Slider Data Configuration ---
const getAssumptionData = (plan: Plan) => {
  const initialSavings = plan.initialSavings || 0;
  console.log("initialSavings", initialSavings);
  const pctInvestmentReturn = plan.pctInvestmentReturn || 0;
  const firstYearReturn = initialSavings * (pctInvestmentReturn / 100);

  return [
    {
      key: "pctSalaryGrowth" as const,
      chartDataKey: "pctSalaryGrowth" as const,
      name: "Tiền lương",
      title: "Tốc độ tăng lương",
      label: "Tốc độ tăng lương hàng năm của bạn là bao nhiêu?",
      explanations: [
        {
          sub: "Tại sao cần tăng lương ít nhất 7%/năm?",
          main: "Tiền lương có thể coi là đòn bẩy lớn nhất, và để nhanh chóng mua được nhà, bạn sẽ cần nỗ lực tăng lương. Mức tăng lương trung bình ở Việt Nam là 7%.",
        },
      ],
      min: 0,
      max: 20,
      step: 1,
      suffix: "%",
    },
    {
      key: "pctHouseGrowth" as const,
      chartDataKey: "pctHouseGrowth" as const,
      name: "Giá nhà",
      title: "Tốc độ tăng giá nhà",
      label:
        "Tốc độ tăng giá nhà là 10%/năm (dựa trên dữ liệu thị trường). Bạn có thể điều chỉnh theo khu vực của bạn nếu muốn.",
      explanations: [
        {
          sub: "Tại sao giá nhà lại tăng 10%/năm?",
          main: "Nhu cầu nhà ở cao, tốc độ đô thị hóa nhanh, chi phí xây dựng tăng và dòng tiền đầu tư liên tục đổ vào bất động sản. Ngoài ra, đây cũng là mức tăng giá ổn định hằng năm, nhất là tại TP.HCM và Hà Nội – nơi quỹ đất khan hiếm và hạ tầng liên tục mở rộng.",
        },
      ],
      min: 0,
      max: 20,
      step: 1,
      suffix: "%",
    },
    {
      key: "pctInvestmentReturn" as const,
      chartDataKey: "pctInvestmentReturn" as const,
      name: "Tích lũy của bạn",
      title: "Tỷ suất tích lũy",
      label: "Bạn có thể đầu tư với tỷ lệ lợi nhuận bao nhiêu?",
      explanations: [
        {
          sub: "Tại sao cần đầu tư sinh lời 11%/năm?",
          main: "Tốc độ tăng giá nhà trung bình là 10%/năm, vì vậy bạn cần đầu tư với tỷ suất sinh lời cao hơn tốc độ tăng giá nhà, ít nhất là 11%/năm.",
        },
        {
          sub: "Số tiền tích luỹ của bạn được tính như thế nào?",
          main: `Tiền tích luỹ ban đầu là ${formatNumber(initialSavings)} triệu VNĐ, sau năm đầu tiên tăng thêm ${formatNumber(firstYearReturn)} triệu VNĐ dựa vào lãi đầu tư. Khoản tích luỹ này còn được cộng thêm từ khoản dư mỗi tháng để sớm đạt mục tiêu`,
        },
      ],
      min: 0,
      max: 25,
      step: 1,
      suffix: "%",
    },
  ];
};

// --- Main Component ---
interface AssumptionProps {
    plan: Plan;
    step: "intro" | "form" | "loading" | "result";
    setStep: (step: "intro" | "form" | "loading" | "result") => void;
    assumptionStep: number;
    onNext: () => void;
    onPrev: () => void;
    onConfirm: () => void;
    result: any | null;
    assumptions: {
        pctSalaryGrowth: number;
        pctHouseGrowth: number;
        pctInvestmentReturn: number;
    };
    onSliderChange: (key: keyof AssumptionProps['assumptions'], value: number) => void;
    onFinalChoice: (year: number) => void;
    chartData: ChartMilestone[]; // Receive chart data from client
    loadingTitle?: string;
}

export default function Assumption({ 
    plan,
    step, 
    setStep,
    assumptionStep,
    onNext,
    onPrev,
    onConfirm,
    result,
    assumptions,
    onSliderChange,
    onFinalChoice,
    chartData,
    loadingTitle,
}: AssumptionProps) {
  const { user, isLoaded } = useUser();
  const assumptionData = getAssumptionData(plan);
  console.log("assumptionData", assumptionData);
  const currentAssumption = assumptionData[assumptionStep];
  const isLastStep = assumptionStep === assumptionData.length - 1;
  const router = useRouter();
  console.log("chartData", generateProjections(plan as any));
  console.log("result",  assumptions[currentAssumption.key]);

  // This useEffect block is redundant and causes the error, so it will be removed.
  // The logic is correctly handled in the parent component AssumptionClient.tsx.

  if (step === "intro") {
    return (
      <>
        <div
          className="max-w-5xl mx-auto fixed inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: "url('/onboarding/section4bg.png')" }}
        />
        {/* Container cho nút Back */}
        <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col p-4 z-10">
          <div className="max-w-5xl mx-auto absolute top-4 left-4 z-20">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/plan/${plan.id}/spending`)}>
                <ArrowLeftIcon className="w-6 h-6 text-white" />
            </Button>
          </div>
          <div className="flex-grow flex flex-col items-center pt-30 px-2 text-center">
            <div className="text-white/80 font-semibold text-lg mb-8">
              Mục 3/3
            </div>
            <Image src="/icons/suitcase 4.png" alt="Giả định & Chiến lược" width={80} height={80} className="mb-6" />
            <h1 className="text-4xl max-md:text-3xl font-bold text-white mb-3">
              Giả định & Chiến lược
            </h1>
            <p className="text-sm text-white/90 max-w-sm">
              Hãy thử tư duy như một nhà hoạch định chiến lược. Bằng cách điều chỉnh các giả định, bạn sẽ thấy tác động của từng quyết định đến tốc độ chạm tay vào ngôi nhà mơ ước.
            </p>
          </div>
          <Button 
            onClick={() => {
              setStep("form"); 
              updateOnboardingSectionProgress(plan.id, "assumption", OnboardingSectionState.IN_PROGRESS);
              updateOnboardingSectionProgress(plan.id, "spending", OnboardingSectionState.COMPLETED);
              updateOnboardingSectionProgress(plan.id, "familySupport", OnboardingSectionState.COMPLETED);
            }} 
            className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-sm shadow-lg transition-transform transform active:scale-95">
            Bắt đầu thôi
          </Button>
        </div>
      </>
    );
  }

  if (step === "form") {
    return (
      <div className="flex flex-col flex-grow w-full max-w-5xl mx-auto fixed inset-0">
        <div className="z-10 bg-slate-950">
          {/* Header Section */}
          <div className="">
            <div className="relative flex items-center h-10 mb-4 mt-2">
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <Button variant="ghost" size="icon" onClick={onPrev}>
                  <ArrowLeftIcon className="w-6 h-6 text-white" />
                </Button>
              </div>

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold text-white text-lg">
                Giả định & chiến lược
              </div>
            </div>
            <ProgressBar current={assumptionStep + 1} total={assumptionData.length} />
          </div>
        </div>

        <div className="z-10 bg-slate-950 px-2">
          <div className="w-full p-2">
            <h2 className="text-base font-semibold text-white max-w-5xl mt-2">{currentAssumption.label}</h2>
            <div className="py-1">
              <FinancialSliders
                items={[{
                  label: currentAssumption.title,
                  value: assumptions[currentAssumption.key],
                  setValue: (value) => {
                    onSliderChange(currentAssumption.key, value);
                  },
                  max: currentAssumption.max,
                  suffix: currentAssumption.suffix,
                }]}
              />
            </div>
            <div className="w-full h-auto rounded-md">
              <AccumulationChart 
                data={chartData} 
                dataKey={currentAssumption.chartDataKey} 
                name={currentAssumption.name}
                name2={currentAssumption.chartDataKey === 'pctInvestmentReturn' ? 'Số tiền cần vay' : undefined}
              />
            </div>
            {currentAssumption.explanations.map((exp, index) => (
              <div key={index} className="mt-2">
                <p className="text-xs text-left text-cyan-500">{exp.sub}</p>
                <p className="text-xs text-left text-slate-400 mt-1 mb-2">{exp.main}</p>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-slate-950 border-t border-slate-800 z-10">
              <Button 
                onClick={onNext} 
                className={cn(
                  "w-full text-lg font-semibold rounded-sm",
                  isLastStep
                    ? "bg-cyan-500 text-white hover:bg-[#008C96]"
                    : "bg-white text-slate-900 hover:bg-slate-200",
                )}
              >
                  {isLastStep ? "Xem kết quả cuối cùng" : "Tiếp tục"}
              </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col z-10 bg-slate-950">
        <LoadingStep title={loadingTitle || "Hoàn thiện kế hoạch"} message={"Đang hoàn thiện kế hoạch"} percentage={100} />
      </div>
    );
  }

  if (step === "result" && result) {
    return (
        <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col z-10 bg-slate-950 text-white">
          <div className="relative flex items-center h-10 mb-4">
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep('form')}
              >
                <ArrowLeftIcon className="w-6 h-6 text-white" />
              </Button>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 mx-4 text-cyan-500">{user?.firstName}, </h2>
              {
                // Case 1: Can purchase, but later than planned
                result.earliestPurchaseYear > (plan.confirmedPurchaseYear ?? Infinity) && (result.earliestPurchaseYear - new Date().getFullYear() <= 3 && result.earliestPurchaseYear - plan.confirmedPurchaseYear! >= 1) ? (
                <div className="flex flex-col mx-4">
                  <div className="text-lg mb-4">
                    Kế hoạch <br/> 
                    <div className="text-cyan-500 font-bold">chinh phục căn nhà đầu tiên</div> 
                    của bạn đã sẵn sàng.
                  </div>
                  <div className="flex items-center justify-center text-center">
                    <Image src="/onboarding/result 1.png" alt="Giả định & Chiến lược" width={300} height={300} className="mb-6" />
                  </div>
                  <div className="text-center text-slate-400">
                    Bạn có thể mua nhà sớm nhất vào năm {result.earliestPurchaseYear}                  
                  </div>
                  <div className="mb-4 items-center justify-center text-center">Bạn muốn điều chỉnh mong muốn không, hay giữ nguyên và lùi thời gian mua nhà?<br/>👇👇👇</div>
                  <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-slate-950 border-t border-slate-800 z-10">
                    <div className="mt-auto pt-4">
                      <Button 
                        onClick={() => router.push(`/plan/${plan.id}/edit`)}
                        variant="outline" 
                        className="w-full bg-slate-700 py-4 font-semibold border-slate-600 text-lg hover:bg-slate-600 text-slate-200 cursor-pointer" 
                      >
                        Điều chỉnh mong muốn
                      </Button>
                    </div>
                    <div className="mt-auto pt-4">
                        <Button onClick={() => onFinalChoice(result.earliestPurchaseYear)} className="w-full hover:bg-gray-300 py-4 text-lg font-semibold rounded-sm shadow-lg cursor-pointer">
                          Mua nhà năm {result.earliestPurchaseYear}
                        </Button>
                    </div>
                  </div>
                </div>
              // Case 2: Can purchase earlier or on time
              ) : (result.earliestPurchaseYear > 0 && result.earliestPurchaseYear - new Date().getFullYear() <= 3 && result.earliestPurchaseYear - plan.confirmedPurchaseYear! >= 1) ? (
              <div className="flex flex-col mx-4">
                <div className="text-lg mb-4">
                  Kế hoạch <br/> 
                  <div className="text-cyan-500 font-bold">chinh phục căn nhà đầu tiên</div>
                  của bạn đã sẵn sàng.
                </div>
                <div className="flex items-center justify-center text-center">
                  <Image src="/onboarding/result 2.png" alt="Giả định & Chiến lược" width={300} height={300} className="mb-6" />
                </div>
                <div className="text-center text-slate-400">
                  Bạn có thể mua nhà vào năm {plan.confirmedPurchaseYear} như mong muốn, thậm chí có thể mua sớm hơn vào năm {result.earliestPurchaseYear}!
                </div>
                <div className="mb-4 items-center justify-center text-center">Hãy chọn thời gian bạn muốn mua nhà!<br/>👇👇👇</div>
                <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-slate-950 border-t border-slate-800 z-10">
                  <div className="mt-auto pt-4">
                    <Button 
                      onClick={() => onFinalChoice(result.earliestPurchaseYear)}
                      variant="outline" 
                      className="w-full bg-slate-700 py-4 font-semibold border-slate-600 text-lg hover:bg-slate-600 text-slate-200 cursor-pointer" 
                    >
                      Mua nhà năm {result.earliestPurchaseYear}
                    </Button>
                  </div>
                  <div className="mt-auto pt-4">
                    <Button onClick={() => onFinalChoice(plan.confirmedPurchaseYear!)} className="w-full hover:bg-gray-300 py-4 text-lg font-semibold rounded-sm shadow-lg cursor-pointer">
                      Mua nhà năm {plan.confirmedPurchaseYear}
                    </Button>
                  </div>
                </div>
    
              </div>
              // Case 3: Cannot purchase
              ) : (result.earliestPurchaseYear === plan.confirmedPurchaseYear) ? (
              <div className="flex flex-col mx-4">
                <div className="text-lg mb-4">
                  Kế hoạch <br/> 
                  <div className="text-cyan-500 font-bold">chinh phục căn nhà đầu tiên</div>
                  của bạn đã sẵn sàng.
                </div>
                <div className="flex items-center justify-center text-center">
                  <Image src="/onboarding/result 3.png" alt="Giả định & Chiến lược" width={300} height={300} className="mb-6" />
                </div>
                <div className="text-center text-slate-400">
                  Bạn hoàn toàn có thể mua nhà vào năm {plan.confirmedPurchaseYear} như mong muốn của mình
                </div>
                <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-slate-950 border-t border-slate-800 z-10">
                  <Button onClick={() => onFinalChoice(plan.confirmedPurchaseYear!)} className="w-full hover:bg-gray-300 py-4 text-lg font-semibold rounded-sm shadow-lg cursor-pointer">
                    Lập kế hoạch mua nha nhà năm {plan.confirmedPurchaseYear}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col mx-4">
                <div className="text-lg mb-4">
                  Bạn sẽ cần điều chỉnh nhiều để<br/> 
                  <div className="text-cyan-500 font-bold">chinh phục căn nhà đầu tiên</div> 
                </div>
                <div className="flex items-center justify-center text-center">
                  <Image src="/onboarding/result 4.png" alt="Giả định & Chiến lược" width={300} height={300} className="mb-6" />
                </div>
                <div className="text-center text-slate-400">
                  Bạn vẫn chưa thể mua được nhà, sẽ cần rất nhiều thay đổi về mong muốn và khả năng tích luỹ đấy!
                </div>
                <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-slate-950 border-t border-slate-800 z-10">
                  <Button onClick={() => router.push(`/plan/${plan.id}/edit`)} className="w-full hover:bg-gray-300 py-4 text-lg font-semibold rounded-sm shadow-lg cursor-pointer">
                    Điều chỉnh mong muốn
                  </Button>
                </div>
              </div>
            )}
        </div>
    );
  }

  return null;
}
