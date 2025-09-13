"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plan, PlanFamilySupport } from "@prisma/client";
import { toast } from "react-hot-toast";

// Import các component section
import QuickCheck from "@/components/onboarding/sections/QuickCheck";
import FamilySupport from "@/components/onboarding/sections/FamilySupport";
import Spending from "@/components/onboarding/sections/Spending";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { updateOnboardingSectionProgress } from "@/actions/onboardingActions";
import { OnboardingSectionState } from "@prisma/client";
import LoadingStep from "@/components/onboarding/shared/LoadingStep";
import { RecalculationResult } from "@/components/onboarding/shared/ResultStep";
import Image from "next/image";
import { generateProjections, PlanWithDetails } from "@/lib/calculations/projections/generateProjections";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, Home } from "lucide-react";
import ProgressBar from "../onboarding/shared/ProgressBar";
import FinancialSliders from "./playground/FinancialSliders";
import AccumulationChart from "./playground/AccumulationChart";
import { generateAccumulationMilestones } from "@/lib/calculations/projections/generateChartData";
import { updateAndRecalculateAssumption } from "@/actions/updateAndRecalculateAssumption";
import { useUser } from "@clerk/nextjs";
import { confirmPurchaseYear } from "@/actions/confirmPurchaseYear";
import { 
  updateQuickCheckSection, 
  updateFamilySupportSection, 
  updateSpendingSection,
  updateAssumptionSectionAndRecalculate,
  runProjectionForPlan
} from "@/actions/editPlan";
import { useDebounce } from "@/hooks/useDebounce"; // Import hook debounce
import { updateSinglePlanField } from "@/actions/editPlan"; // Import action mới
import { useEffect } from "react"; // Import useEffect

interface AssumptionData {
  pctSalaryGrowth: number;
  pctHouseGrowth: number;
  pctInvestmentReturn: number;
}

const assumptionData = [
  {
    key: "pctSalaryGrowth" as const,
    chartDataKey: "pctSalaryGrowth" as const,
    name: "Tiền lương",
    title: "Tốc độ tăng lương",
    label: "Tốc độ tăng lương hàng năm của bạn là bao nhiêu?",
    subExplanation: "Tại sao cần tăng lương ít nhất 7%/năm?",
    explanation: "Tiền lương có thể coi là đòn bẩy lớn nhất, và để nhanh chóng mua được nhà, bạn sẽ cần nỗ lực tăng lương. Mức tăng lương trung bình ở Việt Nam là 7%.",
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
    label: "Tốc độ tăng giá nhà là 10%/năm (dựa trên dữ liệu thị trường). Bạn có thể điều chỉnh theo khu vực của bạn nếu muốn.",
    subExplanation: "Tại sao giá nhà lại tăng 10%/năm?",
    explanation: "Nhu cầu nhà ở cao, tốc độ đô thị hóa nhanh, chi phí xây dựng tăng và dòng tiền đầu tư liên tục đổ vào bất động sản. Ngoài ra, đây cũng là mức tăng giá ổn định hằng năm, nhất là tại TP.HCM và Hà Nội – nơi quỹ đất khan hiếm và hạ tầng liên tục mở rộng.",
    min: 0,
    max: 20,
    step: 1,
    suffix: "%",
  },
  {
    key: "pctInvestmentReturn" as const,
    chartDataKey: "pctInvestmentReturn" as const,
    name: "Lợi nhuận đầu tư",
    title: "Tỷ suất đầu tư",
    label: "Bạn có thể đầu tư với tỷ lệ lợi nhuận bao nhiêu?",
    subExplanation: "Tại sao cần đầu tư sinh lời 11%/năm?",
    explanation: "Tốc độ tăng giá nhà trung bình là 10%/năm, vì vậy bạn cần đầu tư với tỷ suất sinh lời cao hơn tốc độ tăng giá nhà, ít nhất là 11%/năm.",
    min: 0,
    max: 25,
    step: 1,
    suffix: "%",
  }
];

type InteractionLogEntry = {
  timestamp: string;
  type: "interaction_start" | "initial_change" | "reset_to_initial" | "final_submit";
  values?: Record<string, any>;
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
  const [assumptionStep, setAssumptionStep] = useState(0);
  
  // State để quản lý section đang hiển thị
  const [currentSection, setCurrentSection] = useState<EditPlanSection>('quickCheck');
  const [result, setResult] = useState<any | null>(null);
  // State để lưu trữ dữ liệu plan xuyên suốt quá trình chỉnh sửa
  // Khởi tạo với dữ liệu ban đầu được truyền vào
  const [planData, setPlanData] = useState<PlanWithFamilySupport>(initialPlan);

  // STATE MỚI: Quản lý các bước nhỏ bên trong section Assumption
  const [assumptionUiStep, setAssumptionUiStep] = useState<'intro' | 'form' | 'loading' | 'result'>('intro');

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
  const handleQuickCheckCompleted = async (data: Partial<OnboardingPlanState>) => {
    toast.loading("Đang lưu...");
    const result = await updateQuickCheckSection(planData.id, data);
    toast.dismiss();

    if (result.success) {
        setPlanData(prev => ({ ...prev, ...data }));
        setCurrentSection('familySupport');
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
        setCurrentSection('spending');
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
          />
        );

      case 'familySupport':
        return (
          <FamilySupport
            initialData={planData as OnboardingPlanState}
            familySupport={planData.familySupport as OnboardingPlanState}
            planId={planData.id}
            onCompleted={handleFamilySupportCompleted}
            isEditMode={true} // <-- BÁO CHO NÓ BIẾT ĐANG Ở LUỒNG EDIT
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
            const dataKey = assumptionData[assumptionStep].chartDataKey;
            const chartData = useMemo(() => {
              const tempPlan = {
                // Gộp dữ liệu plan hiện tại với giá trị mới từ slider
                ...planData,
                pctSalaryGrowth: assumptions.pctSalaryGrowth,
                pctHouseGrowth: assumptions.pctHouseGrowth,
                pctInvestmentReturn: assumptions.pctInvestmentReturn,
              };
              return generateAccumulationMilestones(tempPlan as PlanWithDetails, dataKey);
            }, [planData, assumptions, dataKey]); // Thêm currentAssumption.chartDataKey vào dependency array

            const currentAssumption = assumptionData[assumptionStep];
            const isLastStep = assumptionStep === assumptionData.length - 1;
            const handleNext = () => {
              if (assumptionStep < 2) {
                setAssumptionStep(prev => prev + 1);
              } else {
                handleAssumptionsSubmit();
              }
            };
          
            const handlePrev = () => {
              if (assumptionStep > 0) {
                setAssumptionStep(prev => prev - 1);
              }
            };

            const handleSubmit = async (formData: AssumptionData) => {
              setAssumptionUiStep("loading");
              const fullData = { ...planData, ...formData };
          
              const assumptionPayload = {
                pctSalaryGrowth: fullData.pctSalaryGrowth,
                pctHouseGrowth: fullData.pctHouseGrowth,
                pctInvestmentReturn: fullData.pctInvestmentReturn,
              };
          
              const result = await updateAndRecalculateAssumption(planData.id, assumptionPayload);
          
              if (result.success) {
                setResult(result as RecalculationResult);
                setAssumptionUiStep("result");
              } else {
                toast.error(result.error || "Có lỗi xảy ra, vui lòng thử lại.");
                setAssumptionUiStep("form"); // Go back to form on error
              }
            };
            

            return (
              <div className="flex flex-col h-full flex-grow w-full max-w-5xl mx-auto fixed inset-0">
                <div className=" z-10 bg-slate-950">
                  {/* Header Section */}
                  <div className="mb-4">
                    <div className="relative flex items-center h-10 mb-4 mt-2">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2">
                        <Button variant="ghost" size="icon" onClick={handlePrev} disabled={assumptionStep === 0}>
                          <ArrowLeftIcon className="w-6 h-6 text-white" />
                        </Button>
                      </div>
        
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold text-white text-lg">
                        Giả định & chiến lược
                      </div>
        
                      <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="absolute bg-slate-700 right-0 top-1/2 -translate-y-1/2 border-slate-600 hover:bg-slate-600 text-slate-200 cursor-pointer" 
                          onClick={() => router.push(`/dashboard`)}
                        >
                          <span className="hidden md:inline">Dashboard</span>
                          <Home className="h-4 w-4 md:hidden" />
                        </Button>
                      </div>
                    </div>
                    <ProgressBar current={assumptionStep + 1} total={assumptionData.length} />
                  </div>
                </div>
        
                <div className="z-10 bg-slate-950 px-2">
                  <div className="p-2 w-full">
                    <h2 className="text-lg font-semibold text-white max-w-5xl mt-2">{currentAssumption.label}</h2>
                      <div className="py-2">
                        <FinancialSliders
                          items={[{
                            label: currentAssumption.title,
                            value: assumptions[currentAssumption.key],
                            setValue: (value) => handleSliderChange(currentAssumption.key, value),
                            max: currentAssumption.max,
                            suffix: currentAssumption.suffix,
                          }]}
                        />
                      </div>
                      <div className="w-full h-auto rounded-md p-2">
                        <AccumulationChart data={chartData} dataKey={currentAssumption.chartDataKey} name={currentAssumption.name} />
                      </div>
                      <p className="text-xs text-left text-cyan-500 mt-2">{currentAssumption.subExplanation}</p>
                      <p className="text-xs text-left text-slate-400 mt-2 mb-2">{currentAssumption.explanation}</p>
                  </div>
        
                  {/* Action Button */}
                  <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-slate-950 border-t border-slate-800 z-10">
                      <Button onClick={handleNext} className="w-full bg-cyan-500 text-white hover:bg-cyan-600 py-4 text-lg font-semibold rounded-sm shadow-lg">
                          {isLastStep ? "Chốt và Lập kế hoạch" : "Tiếp tục"}
                      </Button>
                  </div>
                </div>
              </div>
            );
            
          case 'loading':
            return <LoadingStep title="Đang cập nhật & tính toán lại" message="Quá trình này có thể mất vài giây..." />;
            
          case 'result':
            const { user, isLoaded } = useUser();
            const handleFinalChoice = async (purchaseYear: number) => {
              await confirmPurchaseYear(planData.id, purchaseYear);
              router.push(`/dashboard`);
            };

  return (
              <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col z-10 bg-slate-950 text-white">
                <div className="relative flex items-center h-10 mb-4">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/dashboard`)}
                    >
                      <ArrowLeftIcon className="w-6 h-6 text-white" />
                    </Button>
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2 mx-4 text-cyan-500">{user?.firstName}, </h2>
                  {
                    // Case 1: Can purchase, but later than planned
                    result.earliestPurchaseYear >= (planData.confirmedPurchaseYear ?? Infinity) && (result.earliestPurchaseYear - new Date().getFullYear() <= 3 && result.earliestPurchaseYear - planData.confirmedPurchaseYear! >= 1) ? (
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
                            onClick={() => setAssumptionUiStep('form')}
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
                  ) : (result.earliestPurchaseYear > 0 && result.earliestPurchaseYear - new Date().getFullYear() <= 3 && result.earliestPurchaseYear - planData.confirmedPurchaseYear! >= 1) ? (
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
                      Bạn có thể mua nhà vào năm {planData.confirmedPurchaseYear} như mong muốn, thậm chí có thể mua sớm hơn vào năm {result.earliestPurchaseYear}!
                    </div>
                    <div className="mb-4 items-center justify-center text-center">Hãy chọn thời gian bạn muốn mua nhà!<br/>👇👇👇</div>
                    <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-slate-950 border-t border-slate-800 z-10">
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
                  ) : (
                  <div className="flex flex-col mx-4">
                    <div className="text-lg mb-4">
                      Bạn sẽ cần điều chỉnh nhiều để<br/> 
                      <div className="text-cyan-500 font-bold">chinh phục căn nhà đầu tiên</div> 
                    </div>
                    <div className="flex items-center justify-center text-center">
                      <Image src="/onboarding/result 3.png" alt="Giả định & Chiến lược" width={300} height={300} className="mb-6" />
                    </div>
                    <div className="text-center text-slate-400">
                      Bạn vẫn chưa thể mua được nhà, sẽ cần rất nhiều thay đổi về mong muốn và khả năng tích luỹ đấy!
                    </div>
                    <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-slate-950 border-t border-slate-800 z-10">
                      <Button onClick={() => setAssumptionUiStep('form')} className="w-full hover:bg-gray-300 py-4 text-lg font-semibold rounded-sm shadow-lg cursor-pointer">
                        Điều chỉnh mong muốn
                      </Button>
                    </div>
                  </div>
                )}
    </div>
  );
}
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-950 text-white w-full">
      <div className="w-full max-w-5xl flex flex-col h-full flex-1">
        {renderSection()}
      </div>
    </div>
  );
}