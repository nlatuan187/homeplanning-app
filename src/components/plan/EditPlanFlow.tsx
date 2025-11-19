"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plan, PlanFamilySupport } from "@prisma/client";
import { toast } from "react-hot-toast";

// Import các component section
import QuickCheck from "@/components/onboarding/sections/QuickCheck";
import FamilySupport from "@/components/onboarding/sections/FamilySupport";
import Spending from "@/components/onboarding/sections/Spending";
import { OnboardingPlanState, ProjectionResult } from "@/components/onboarding/types";
import LoadingStep from "@/components/onboarding/shared/LoadingStep";
import { RecalculationResult } from "@/components/onboarding/shared/ResultStep";
import Image from "next/image";
import { PlanWithDetails } from "@/lib/calculations/projections/generateProjections";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, Home } from "lucide-react";
import ProgressBar from "../onboarding/shared/ProgressBar";
import FinancialSliders from "./playground/FinancialSliders";
import AccumulationChart from "./playground/AccumulationChart";
import { generateAccumulationMilestones } from "@/lib/calculations/projections/generateChartData";
import { useUser } from "@clerk/nextjs";
import { confirmPurchaseYear } from "@/actions/confirmPurchaseYear";
import {
  updateQuickCheckSection,
  updateFamilySupportSection,
  updateSpendingSection,
  runProjectionForPlan,
  deleteOnboardingProgress // <-- IMPORT ACTION MỚI
} from "@/actions/editPlan";
import { useDebounce } from "@/hooks/useDebounce"; // Import hook debounce
import { updateSinglePlanField } from "@/actions/editPlan"; // Import action mới
import { useEffect } from "react"; // Import useEffect
import { cn } from "@/lib/utils";
import { DataKey } from "@/lib/calculations/projections/generateChartData";
import Schedule from "../onboarding/sections/Schedule";
import Accept from "../onboarding/sections/Accept";
import ContactModal from "../onboarding/sections/ContactModal";
import { saveContact } from "@/actions/onboardingActions";

const findSelectedProfile = (options: any[], returnValue: number) => {
  return options.find(option => {
    // The last option has an inclusive max range
    if (option.value === 'expert') {
      return returnValue >= option.minReturn && returnValue <= option.maxReturn;
    }
    return returnValue >= option.minReturn && returnValue < option.maxReturn;
  });
};

const getAssumptionData = (plan: Plan, assumptions: { pctInvestmentReturn: number }) => {
  const riskProfileStep = {
    key: "riskProfile" as const,
    type: "radio" as const,
    chartDataKey: "pctInvestmentReturn" as const,
    name: "Tích lũy của bạn",
    title: "Chọn mô tả đúng nhất về bạn:",
    label: "Chọn mô tả đúng nhất về bạn:",
    explanations: [
      {
        sub: "Thay vì để khoản tiết kiệm và khoản tiền dư ra hàng hàng tháng \"đứng yên\", chúng tôi sẽ giúp bạn xây dựng kế hoạch để nó tăng trưởng",
        main: "",
      },
    ],
    options: [
      {
        value: "safety",
        title: "Ưu tiên sự an toàn, không muốn mất vốn",
        sub: "Đề xuất định hướng: ",
        targetReturn: "4% - 6%/năm",
        description: "Gửi tiết kiệm, tích luỹ an toàn,...",
        minReturn: 4,
        maxReturn: 6,
        returnRate: 5
      },
      {
        value: "balanced",
        title: "Chấp nhận biến động để có tăng trưởng tốt hơn",
        sub: "Đề xuất định hướng: ",
        targetReturn: "6% - 10%/năm",
        description: "Tích luỹ an toàn, đầu tư tăng trưởng",
        minReturn: 6,
        maxReturn: 10,
        returnRate: 8
      },
      {
        value: "growth",
        title: "Chấp nhận rủi ro cao để tối đa hoá tăng trưởng",
        sub: "Sản phẩm tài chính đề xuất: ",
        targetReturn: "10% - 14%/năm",
        description: "Đầu tư tăng trưởng thông qua các sản phẩm uỷ thác.",
        minReturn: 10,
        maxReturn: 14,
        returnRate: 12
      },
      {
        value: "expert",
        title: "Cần sự tư vấn trực tiếp của chuyên gia",
        sub: "Sản phẩm tài chính đề xuất: ",
        targetReturn: "14% - 20%/năm",
        description: "Đầu tư tăng trưởng thông với sự đồng hành của chuyên gia từ Finful.",
        minReturn: 14,
        maxReturn: 20,
        returnRate: 17
      }
    ]
  };

  const riskColors = {
    safety: '#22c55e',   // green-500
    balanced: '#3b82f6', // blue-500
    growth: '#f97316',   // orange-500
    expert: '#ef4444',   // red-500
  };

  const sliderColorRanges = riskProfileStep.options.map(option => ({
    min: option.minReturn,
    max: option.maxReturn,
    color: riskColors[option.value as keyof typeof riskColors],
    isLast: option.value === 'expert'
  }));

  const investmentReturnStep = {
    key: "pctInvestmentReturn" as const,
    type: "slider" as const,
    chartDataKey: "pctInvestmentReturn" as const,
    name: "Tích lũy của bạn",
    title: "Tỷ suất tích lũy",
    label: "Cụ thể mục tiêu tăng trưởng tài sản của bạn mỗi năm là bao nhiêu? (đơn vị: %)",
    explanations: [],
    min: 4,
    max: 20,
    step: 0.5,
    suffix: "%",
    isCustom: true,
    colorRanges: sliderColorRanges,
  };

  const assumptionItems: any[] = [
    {
      key: "pctSalaryGrowth" as const,
      type: "slider" as const,
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
      type: "slider" as const,
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
    riskProfileStep,
    investmentReturnStep,
  ];

  return assumptionItems;
};

// Định nghĩa các section trong luồng chỉnh sửa
type EditPlanSection = 'quickCheck' | 'familySupport' | 'spending' | 'assumptions';

// Mở rộng kiểu Plan để bao gồm cả familySupport
type PlanWithFamilySupport = Plan & {
  familySupport: PlanFamilySupport | null;
};

interface EditPlanFlowProps {
  initialPlan: PlanWithFamilySupport;
}

export default function EditPlanFlow({ initialPlan }: EditPlanFlowProps) {
  const router = useRouter();

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactModalSource, setContactModalSource] = useState<'expert' | 'result' | null>(null);
  const { user, isLoaded } = useUser();
  const [assumptionStep, setAssumptionStep] = useState(0);


  function AssumptionFormStep({
    planData,
    assumptions,
    assumptionStep,
    onSliderChange,
    onNext,
    onPrev,
    router,
  }: {
    planData: PlanWithFamilySupport;
    assumptions: any;
    assumptionStep: number;
    onSliderChange: (key: "pctSalaryGrowth" | "pctHouseGrowth" | "pctInvestmentReturn", value: number) => void;
    onNext: () => void;
    onPrev: () => void;
    router: any;
  }) {
    const assumptionData = getAssumptionData(planData, assumptions);
    const dataKey = assumptionData[assumptionStep].chartDataKey;
    const chartData = useMemo(() => {
      const tempPlan = {
        ...planData,
        pctSalaryGrowth: assumptions.pctSalaryGrowth,
        pctHouseGrowth: assumptions.pctHouseGrowth,
        pctInvestmentReturn: assumptions.pctInvestmentReturn,
        // SỬA LỖI: Thêm bước chuyển đổi đơn vị giá nhà
        targetHousePriceN0: (planData.targetHousePriceN0 || 0) * 1000,
      };
      return generateAccumulationMilestones(tempPlan as PlanWithDetails, dataKey as DataKey);
    }, [planData, assumptions, dataKey]);

    const currentAssumption = assumptionData[assumptionStep];
    const isLastStep = assumptionStep === assumptionData.length - 1;
    const handleOpenContactModal = (source: 'expert' | 'result') => {
      setContactModalSource(source);
      setIsContactModalOpen(true);
    };

    return (
      <div className="flex flex-col h-full flex-grow w-full max-w-5xl mx-auto fixed inset-0">
        <div className=" z-10 bg-[#121212]">
          <div className="mb-4">
            <div className="relative flex items-center h-10 mb-4 mt-2">
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <Button variant="ghost" size="icon" onClick={onPrev} disabled={assumptionStep === 0}>
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

        <div className="z-10 bg-[#121212] px-2 mt-3 overflow-y-auto">
          <div className="p-2 w-full pb-20">
            <h2 className="text-lg font-semibold text-white max-w-5xl mt-2">{currentAssumption.label}</h2>

            {currentAssumption.type === 'radio' ? (
              <div className="py-1">
                {currentAssumption.explanations.map((exp: any, index: number) => (
                  <div key={index} className="mt-2 mb-4 p-4 rounded-md bg-slate-900 border border-slate-800 flex flex-col items-center text-center">
                    <Image src="/onboarding/increase.png" alt="Growth" width={60} height={60} className="mb-2 text-cyan-400" />
                    <p className="text-sm text-slate-300">
                      Thay vì để <span className="font-semibold text-white">khoản tiết kiệm</span> và <span className="font-semibold text-white">khoản tiền dư ra hàng tháng</span> “đứng yên”, chúng tôi sẽ giúp bạn xây dựng kế hoạch để nó tăng trưởng
                    </p>
                  </div>
                ))}
                <div className="space-y-3">
                  {currentAssumption.options.map((option: any) => {
                    const selectedProfile = findSelectedProfile(currentAssumption.options, assumptions.pctInvestmentReturn);
                    const isSelected = selectedProfile?.value === option.value;
                    return (
                      <div
                        key={option.value}
                        onClick={() => {
                          if (option.value === 'expert') {
                            // SỬA LỖI 1: Cập nhật giá trị ngay để UI phản hồi
                            onSliderChange('pctInvestmentReturn', option.returnRate);
                            handleOpenContactModal('expert');
                          } else {
                            onSliderChange('pctInvestmentReturn', option.returnRate);
                          }
                        }}
                        className={cn(
                          "p-4 border rounded-md cursor-pointer transition-all",
                          isSelected ? "border-cyan-500 bg-cyan-500/10" : "border-slate-700 bg-slate-900 hover:bg-slate-800"
                        )}
                      >
                        <div className="flex items-center">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4",
                            isSelected ? "border-cyan-500 bg-cyan-500" : "border-slate-500"
                          )}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-slate-900"></div>}
                          </div>
                          <div className="flex-1">
                            <h3 className={cn("font-semibold text-mx", isSelected ? "text-cyan-400" : "text-white")}>{option.title}</h3>
                            <div className="text-xs text-slate-400 mt-2 grid grid-cols-2 gap-x-4">
                              <div>
                                <p className="font-medium">Mức tăng mục tiêu:</p>
                                <p>{option.targetReturn}</p>
                              </div>
                              <div>
                                <p className="font-medium">{option.sub}</p>
                                <p>{option.description}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="py-1">
                  <FinancialSliders
                    items={[{
                      label: currentAssumption.title,
                      value: assumptions[currentAssumption.key as keyof typeof assumptions],
                      setValue: (value) => {
                        onSliderChange(currentAssumption.key as "pctInvestmentReturn" | "pctSalaryGrowth" | "pctHouseGrowth", value);
                      },
                      min: currentAssumption.min,
                      max: currentAssumption.max,
                      suffix: currentAssumption.suffix,
                      isCustom: currentAssumption.isCustom,
                      colorRanges: currentAssumption.colorRanges,
                    }]}
                  />
                </div>
                <div className="w-full h-auto rounded-md">
                  <AccumulationChart
                    data={chartData}
                    name={currentAssumption.name}
                    name2={currentAssumption.chartDataKey === 'pctInvestmentReturn' ? 'Số tiền cần vay' : undefined}
                    hasComparisonData={currentAssumption.chartDataKey === 'pctInvestmentReturn'}
                  />
                </div>
                {currentAssumption.type === 'slider' && currentAssumption.explanations.map((exp: any, index: number) => (
                  <div key={index} className="mt-2">
                    <p className="text-xs text-left text-cyan-500">{exp.sub}</p>
                    <p className="text-xs text-left text-slate-400 mt-1 mb-2">{exp.main}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Action Button */}
          <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-[#121212] border-t border-slate-800 z-10">
            <Button
              onClick={onNext}
              className={cn(
                "w-full text-lg font-semibold rounded-sm",
                isLastStep
                  ? "bg-cyan-500 text-white hover:bg-[#008C96]"
                  : "bg-white text-slate-900 hover:bg-slate-200",
              )}
            >
              {isLastStep ? "Chốt và Lập kế hoạch" : "Tiếp tục"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function AssumptionResultStep({
    planData,
    result,
    setAssumptionUiStep,
    router,
  }: {
    planData: PlanWithFamilySupport;
    result: any;
    setAssumptionUiStep: (step: 'form' | 'schedule' | 'accept') => void;
    router: any;
  }) {
    const { user } = useUser();
    const handleFinalChoice = async (purchaseYear: number) => {
      // Bọc trong try...catch để xử lý lỗi tốt hơn
      try {
        await confirmPurchaseYear(planData.id, purchaseYear);
        // GỌI ACTION MỚI: Xóa progress sau khi đã xác nhận
        await deleteOnboardingProgress(planData.id);
        toast.success("Kế hoạch của bạn đã được cập nhật!");
        router.push(`/dashboard`);
      } catch (error) {
        toast.error("Đã có lỗi xảy ra khi cập nhật kế hoạch của bạn.");
        console.error("Failed to finalize plan:", error);
      }
    };

    const handleOpenContactModal = (source: 'expert' | 'result') => {
      setContactModalSource(source);
      setIsContactModalOpen(true);
    };

    return (
      <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col z-10 bg-[#121212] text-white">
        <div className="relative flex items-center h-10 mb-4">
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAssumptionUiStep('form')}
            >
              <ArrowLeftIcon className="w-6 h-6 text-white" />
            </Button>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2 mx-4 text-cyan-500">{user?.firstName}, </h2>
        {
          // Case 1: Can purchase, but later than planned
          result.earliestPurchaseYear > (planData.confirmedPurchaseYear ?? Infinity) && (result.earliestPurchaseYear - new Date().getFullYear() <= 3 && result.earliestPurchaseYear - planData.confirmedPurchaseYear! > 1) ? (
            <div className="flex flex-col mx-4">
              <div className="text-lg mb-4">
                Kế hoạch <br />
                <div className="text-cyan-500 font-bold">chinh phục căn nhà đầu tiên</div>
                của bạn đã sẵn sàng.
              </div>
              <div className="flex items-center justify-center text-center">
                <Image src="/onboarding/result 1.png" alt="Giả định & Chiến lược" width={300} height={300} className="mb-6" />
              </div>
              <div className="text-center text-slate-400">
                Bạn có thể mua nhà sớm nhất vào năm {result.earliestPurchaseYear}
              </div>
              <div className="mb-4 items-center justify-center text-center">Bạn muốn điều chỉnh mong muốn không, hay giữ nguyên và lùi thời gian mua nhà?<br />👇👇👇</div>
              <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-[#121212] border-t border-slate-800 z-10">
                <div className="mt-auto pt-4">
                  <Button
                    onClick={() => router.push(`/plan/${planData.id}/edit`)}
                    variant="outline"
                    className="w-full bg-slate-700 py-4 font-semibold border-slate-600 text-lg hover:bg-slate-600 text-slate-200 cursor-pointer"
                  >
                    Điều chỉnh mong muốn
                  </Button>
                </div>
                <div className="mt-auto pt-4">
                  <Button onClick={() => handleFinalChoice(result.earliestPurchaseYear)} className="w-full hover:bg-gray-300 py-4 text-lg font-semibold rounded-sm shadow-lg cursor-pointer">
                    Mua nhà năm {result.earliestPurchaseYear}
                  </Button>
                </div>
              </div>
            </div>
            // Case 2: Can purchase earlier or on time
          ) : (result.earliestPurchaseYear > 0 && result.earliestPurchaseYear - new Date().getFullYear() <= 3 && result.earliestPurchaseYear - planData.confirmedPurchaseYear! > 1) ? (
            <div className="flex flex-col mx-4">
              <div className="text-lg mb-4">
                Kế hoạch <br />
                <div className="text-cyan-500 font-bold">chinh phục căn nhà đầu tiên</div>
                của bạn đã sẵn sàng.
              </div>
              <div className="flex items-center justify-center text-center">
                <Image src="/onboarding/result 2.png" alt="Giả định & Chiến lược" width={300} height={300} className="mb-6" />
              </div>
              <div className="text-center text-slate-400">
                Bạn có thể mua nhà vào năm {planData.confirmedPurchaseYear} như mong muốn, thậm chí có thể mua sớm hơn vào năm {result.earliestPurchaseYear}!
              </div>
              <div className="mb-4 items-center justify-center text-center">Hãy chọn thời gian bạn muốn mua nhà!<br />👇👇👇</div>
              <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-[#121212] border-t border-slate-800 z-10">
                <div className="mt-auto pt-4">
                  <Button
                    onClick={() => handleFinalChoice(result.earliestPurchaseYear)}
                    variant="outline"
                    className="w-full bg-slate-700 py-4 font-semibold border-slate-600 text-lg hover:bg-slate-600 text-slate-200 cursor-pointer"
                  >
                    Mua nhà năm {result.earliestPurchaseYear}
                  </Button>
                </div>
                <div className="mt-auto pt-4">
                  <Button onClick={() => handleFinalChoice(planData.confirmedPurchaseYear!)} className="w-full hover:bg-gray-300 py-4 text-lg font-semibold rounded-sm shadow-lg cursor-pointer">
                    Mua nhà năm {planData.confirmedPurchaseYear}
                  </Button>
                </div>
              </div>

            </div>
            // Case 3: Cannot purchase
          ) : (result.earliestPurchaseYear === planData.confirmedPurchaseYear && result.earliestPurchaseYear - new Date().getFullYear() >= 1) ? (
            <div className="flex flex-col mx-4">
              <div className="text-lg mb-4">
                Kế hoạch <br />
                <div className="text-cyan-500 font-bold">chinh phục căn nhà đầu tiên</div>
                của bạn đã sẵn sàng.
              </div>
              <div className="flex items-center justify-center text-center">
                <Image src="/onboarding/result 3.png" alt="Giả định & Chiến lược" width={300} height={300} className="mb-6" />
              </div>
              <div className="text-center text-slate-400">
                Bạn hoàn toàn có thể mua nhà vào năm {planData.confirmedPurchaseYear} như mong muốn của mình
              </div>
              <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-[#121212] border-t border-slate-800 z-10">
                <Button onClick={() => handleFinalChoice(planData.confirmedPurchaseYear!)} className="w-full hover:bg-gray-300 py-4 text-lg font-semibold rounded-sm shadow-lg cursor-pointer">
                  Lập kế hoạch mua nhà năm {planData.confirmedPurchaseYear}
                </Button>
              </div>
            </div>
          ) : (planData.confirmedPurchaseYear && planData.confirmedPurchaseYear - result.earliestPurchaseYear <= 1) ? (
            <div className="flex flex-col mx-4">
              <div className="text-lg mb-4">
                Bạn có thể<br />
                <div className="text-cyan-500 font-bold">mua được nhà</div>
                trong vòng 1 năm tới
              </div>
              <div className="flex items-center justify-center text-center">
                <Image src="/onboarding/result 2.png" alt="Giả định & Chiến lược" width={300} height={300} className="mb-6" />
              </div>
              <div className="text-center text-slate-400">
                Câu hỏi bây giờ là: “Đâu là chiến lược hành động tốt nhất?”. Để trả lời câu hỏi này, một buổi hoạch định chiến lược 1-1 với chuyên gia của Finful là bước đi cần thiết.
              </div>

              <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-[#121212] border-t border-slate-800 z-10">
                <div className="mt-auto pt-4">
                  <Button
                    onClick={() => handleFinalChoice(result.earliestPurchaseYear)}
                    variant="outline"
                    className="w-full bg-slate-700 py-4 font-semibold border-slate-600 text-lg hover:bg-slate-600 text-slate-200 cursor-pointer"
                  >
                    Tiếp tục hành trình tích lũy
                  </Button>
                </div>
                <div className="mt-auto pt-4">
                  <Button onClick={() => setAssumptionUiStep('schedule')} className="w-full hover:bg-gray-300 py-4 text-lg font-semibold rounded-sm shadow-lg cursor-pointer">
                    Đặt lịch tư vấn 1-1
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col mx-4">
              <div className="text-lg mb-4">
                Bạn chưa thể<br />
                <div className="text-cyan-500 font-bold">mua được căn nhà như mong muốn</div>
              </div>
              <div className="flex items-center justify-center text-center">
                <Image src="/onboarding/result 4.png" alt="Giả định & Chiến lược" width={300} height={300} className="mb-6" />
              </div>
              <div className="text-center text-slate-400">
                Mọi kế hoạch lớn đều cần sự tinh chỉnh. Bạn có muốn trò chuyện 15 phút miễn phí với chuyên gia của Finful để cùng tìm ra giải pháp không?
              </div>
              <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-[#121212] border-t border-slate-800 z-10">
                <Button onClick={() => handleOpenContactModal('result')} className="w-full hover:bg-gray-300 py-4 text-lg font-semibold rounded-sm shadow-lg cursor-pointer">
                  Trò chuyện cùng chuyên gia
                </Button>
              </div>
            </div>
          )}
      </div>
    );
  }
  const [currentSection, setCurrentSection] = useState<EditPlanSection>('quickCheck');
  const [result, setResult] = useState<any | null>(null);
  // State để lưu trữ dữ liệu plan xuyên suốt quá trình chỉnh sửa
  // Khởi tạo với dữ liệu ban đầu được truyền vào
  const [planData, setPlanData] = useState<PlanWithFamilySupport>(initialPlan);

  // STATE MỚI: Quản lý các bước nhỏ bên trong section Assumption
  const [assumptionUiStep, setAssumptionUiStep] = useState<'intro' | 'form' | 'loading' | 'result' | 'schedule' | 'accept'>('intro');

  const handleContactSubmit = async (phone: string) => { // Bỏ tham số assumptionData không cần thiết
    try {
      const userId = user?.id;
      if (!userId) {
        throw new Error("User ID not found.");
      }
      await saveContact(phone, userId);
      toast.success("Thông tin của bạn đã được gửi thành công. Chúng tôi sẽ liên hệ với bạn sớm nhất có thể.");
      setIsContactModalOpen(false);

      if (contactModalSource === 'expert') {
        // Tạo lại dữ liệu assumption ở đây thay vì nhận từ tham số
        const assumptionData = getAssumptionData(planData, assumptions);
        const riskProfileStep = assumptionData.find((item: any) => item.key === "riskProfile");
        if (riskProfileStep && (riskProfileStep as any).options) {
          const expertOption = (riskProfileStep as any).options.find((opt: any) => opt.value === 'expert');
          if (expertOption) {
            handleSliderChange('pctInvestmentReturn', expertOption.returnRate);
          }
        }
        // Đợi một chút để state được cập nhật trước khi submit
        setTimeout(handleAssumptionsSubmit, 100);
      } else {
        setAssumptionUiStep("accept");
      }
      setContactModalSource(null);
    } catch (error) {
      console.error("Failed to save contact:", error);
      toast.error("Đã có lỗi xảy ra. Vui lòng thử lại.");
    }
  };

  // --- LOGIC MỚI CHO ASSUMPTION ---

  // State `assumptions` vẫn được dùng để điều khiển UI của slider ngay lập tức
  const [assumptions, setAssumptions] = useState({
    pctSalaryGrowth: initialPlan.pctSalaryGrowth ?? 7,
    pctHouseGrowth: initialPlan.pctHouseGrowth ?? 10,
    pctInvestmentReturn: initialPlan.pctInvestmentReturn ?? 11,
  });

  // Sử dụng debounce cho giá trị assumptions
  const debouncedAssumptions = useDebounce(assumptions, 500); // Chờ 500ms sau khi người dùng ngừng kéo

  // useEffect để theo dõi sự thay đổi của giá trị đã debounce
  useEffect(() => {
    // Hàm này sẽ so sánh giá trị đã debounce với giá trị ban đầu (initialPlan)
    // để chỉ gọi update cho những trường thực sự thay đổi.
    const updateChangedFields = async () => {
      if (debouncedAssumptions.pctSalaryGrowth !== initialPlan.pctSalaryGrowth) {
        await updateSinglePlanField(initialPlan.id, 'pctSalaryGrowth', debouncedAssumptions.pctSalaryGrowth);
      }
      if (debouncedAssumptions.pctHouseGrowth !== initialPlan.pctHouseGrowth) {
        await updateSinglePlanField(initialPlan.id, 'pctHouseGrowth', debouncedAssumptions.pctHouseGrowth);
      }
      if (debouncedAssumptions.pctInvestmentReturn !== initialPlan.pctInvestmentReturn) {
        await updateSinglePlanField(initialPlan.id, 'pctInvestmentReturn', debouncedAssumptions.pctInvestmentReturn);
      }
      // Sau khi update, có thể refresh lại dữ liệu plan để initialPlan luôn mới nhất
      // router.refresh(); // Cân nhắc dùng để tránh stale data
    };

    updateChangedFields();

  }, [debouncedAssumptions, initialPlan.id, initialPlan]);


  // Hàm này được truyền vào component Assumption
  const handleSliderChange = (key: keyof typeof assumptions, value: number) => {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
    // Cập nhật cả planData để biểu đồ được vẽ lại ngay lập tức
    setPlanData((prev) => ({ ...prev, [key]: value }));
  };

  // Nút "Tiếp theo" ở cuối Assumption bây giờ sẽ chỉ tính toán và hiển thị kết quả
  const handleAssumptionsSubmit = async () => {
    setAssumptionUiStep('loading');
    // Gọi action chỉ để tính toán, không cần truyền data vì DB đã được cập nhật
    const result = await runProjectionForPlan(initialPlan.id); // Cần một action mới chỉ để tính toán

    if (result.success) {
      setResult(result as unknown as RecalculationResult);
      setAssumptionUiStep('result');
    } else {
      toast.error(result.error || "Lỗi khi tính toán");
      setAssumptionUiStep('form');
    }
  };

  // Các hàm xử lý khi một section hoàn thành để chuyển sang section tiếp theo
  const handleQuickCheckCompleted = async ({
    onboardingData,
    quickCheckResult,
  }: {
    onboardingData: Partial<OnboardingPlanState>;
    quickCheckResult: ProjectionResult;
  }) => {
    toast.loading("Đang lưu...");
    const result = await updateQuickCheckSection(planData.id, onboardingData);
    toast.dismiss();

    if (result.success) {
      setPlanData((prev) => ({ ...prev, ...onboardingData }));
      setCurrentSection("familySupport");
    } else {
      toast.error(result.error || "Lưu thất bại");
    }
  };

  const handleFamilySupportCompleted = async (data: Partial<OnboardingPlanState>) => {
    toast.loading("Đang lưu...");
    const result = await updateFamilySupportSection(planData.id, data);
    toast.dismiss();

    if (result.success) {
      setPlanData(prev => ({ ...prev, ...data })); // Cập nhật state để truyền cho các bước sau
      setCurrentSection('spending');
    } else {
      toast.error(result.error || "Lưu thất bại");
    }
  };

  const handleSpendingCompleted = async (data: Partial<OnboardingPlanState>) => {
    toast.loading("Đang lưu...");
    const result = await updateSpendingSection(planData.id, data);
    toast.dismiss();

    if (result.success) {
      setPlanData(prev => ({ ...prev, ...data })); // Cập nhật state để truyền cho các bước sau
      setCurrentSection('assumptions');
    } else {
      toast.error(result.error || "Lưu thất bại");
    }
  };
  // Cập nhật logic render
  const renderSection = () => {
    switch (currentSection) {
      case 'quickCheck':
        // Component QuickCheck sẽ cần được refactor để nhận initialData và planId
        return (
          <QuickCheck
            quickCheck={planData as OnboardingPlanState}
            // @ts-ignore - Giả định component sẽ được cập nhật để nhận props này
            initialData={planData}
            planId={planData.id}
            onCompleted={handleQuickCheckCompleted}
            isEditMode={true}
          />
        );

      case 'familySupport':
        return (
          <FamilySupport
            initialData={planData as OnboardingPlanState}
            familySupport={planData.familySupport as OnboardingPlanState}
            planId={planData.id}
            onSubmit={handleFamilySupportCompleted}
            isEditMode={true}
          />
        );

      case 'spending':
        return (
          <Spending
            initialData={planData as OnboardingPlanState}
            plan={planData as OnboardingPlanState}
            planId={planData.id}
            onCompleted={handleSpendingCompleted}
            isEditMode={true} // <-- BÁO CHO NÓ BIẾT ĐANG Ở LUỒNG EDIT
          />
        );

      case 'assumptions':
        // Lấy dữ liệu giả định ra ngoài để có thể truy cập độ dài của nó
        const assumptionData = getAssumptionData(planData, assumptions);

        const handleNextAssumptionStep = () => {
          // SỬA LỖI: So sánh với tổng số bước thực tế, không hardcode
          if (assumptionStep < assumptionData.length - 1) {
            setAssumptionStep(prev => prev + 1);
          } else {
            handleAssumptionsSubmit();
          }
        };

        const handlePrevAssumptionStep = () => {
          if (assumptionStep > 0) {
            setAssumptionStep(prev => prev - 1);
          }
        };

        switch (assumptionUiStep) {
          case 'intro':
            return (
              <>
                <div
                  className="max-w-5xl mx-auto fixed inset-0 bg-cover bg-center z-0"
                  style={{ backgroundImage: "url('/onboarding/section4bg.png')" }}
                />
                <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col p-8 z-10">
                  <div className="flex-grow flex flex-col items-center justify-center text-center">
                    <div className="text-white/80 font-semibold mb-8">Mục 3/3</div>
                    <Image src="/icons/suitcase 4.png" alt="Giả định & Chiến lược" width={80} height={80} className="mb-6" />
                    <h1 className="text-4xl max-md:text-3xl font-bold text-white mb-3">
                      Giả định & Chiến lược
                    </h1>
                    <p className="text-lg text-white/90 max-w-lg">
                      Hãy thử tư duy như một nhà hoạch định chiến lược. Bằng cách điều chỉnh các giả định, bạn sẽ thấy tác động của từng quyết định đến tốc độ chạm tay vào ngôi nhà mơ ước.
                    </p>
                  </div>
                  <Button onClick={() => setAssumptionUiStep("form")} className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-sm shadow-lg transition-transform transform active:scale-95">
                    Bắt đầu thôi
                  </Button>
                </div>
              </>
            );

          case 'form':
            return (
              <AssumptionFormStep
                planData={planData}
                assumptions={assumptions}
                assumptionStep={assumptionStep}
                onSliderChange={handleSliderChange}
                onNext={handleNextAssumptionStep}
                onPrev={handlePrevAssumptionStep}
                router={router}
              />
            );

          case 'loading':
            return <LoadingStep title="Đang cập nhật & tính toán lại" message="Quá trình này có thể mất vài giây..." />;

          case 'result':
            return (
              <AssumptionResultStep
                planData={planData}
                result={result}
                setAssumptionUiStep={setAssumptionUiStep}
                router={router}
              />
            );
          case 'schedule':
            return <Schedule onConfirm={() => setAssumptionUiStep('accept')} />;

          case 'accept':
            return <Accept />;
        }
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#121212] text-white w-full">
      {/* SỬA LỖI 2: Di chuyển Modal vào trong cây JSX được return */}
      {isContactModalOpen && (
        <ContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          onSubmit={handleContactSubmit}
          currentPhone={user?.phoneNumbers?.[0]?.phoneNumber}
        />
      )}
      <div className="w-full max-w-5xl flex flex-col h-full flex-1">
        {renderSection()}
      </div>
    </div>
  );
}