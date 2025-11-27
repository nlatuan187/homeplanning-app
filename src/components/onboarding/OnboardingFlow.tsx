"use client";

import { useMemo, useState, useEffect } from "react"; // Thêm useEffect
import { OnboardingPlanState } from "./types";
import QuickCheck from "./sections/QuickCheck";
import SignupPrompt from "./sections/SignupPrompt";
import FamilySupport from "./sections/FamilySupport";
import Spending from "./sections/Spending";
import Assumption from "./sections/Assumption";
import { Plan } from "@prisma/client";
import { useAuth } from "@clerk/nextjs";
import { QuickCheckResultPayload, createPlanFromOnboarding } from "@/actions/createPlanFromOnboarding";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import LoadingStep from "./shared/LoadingStep";
import { generateAccumulationMilestones, DataKey } from "@/lib/calculations/projections/generateChartData"; // Import DataKey
import { PlanWithDetails } from "@/lib/calculations/projections/generateProjections";

type OnboardingSection = 'quickCheck' | 'signupPrompt' | 'familySupport' | 'spending' | 'assumptions';

interface OnboardingFlowProps {
  planId: string;
  initialStep?: "intro" | "form1";
  initialData?: Partial<OnboardingPlanState>;
}

export default function OnboardingFlow({ planId, initialStep = "intro", initialData = {} }: OnboardingFlowProps) {
  const [currentSection, setCurrentSection] = useState<OnboardingSection>('quickCheck');
  const [planState, setPlanState] = useState<Partial<OnboardingPlanState>>(initialData);
  
  // --- STATE MỚI CHO PHẦN ASSUMPTIONS (ĐÃ KHÔI PHỤC) ---
  const [assumptionWizardStep, setAssumptionWizardStep] = useState(0); // 0: Lương, 1: Nhà, 2: Đầu tư
  const [assumptionInternalStep, setAssumptionInternalStep] = useState<"intro" | "form" | "loading" | "result" | "accept" | "schedule">("intro");
  
  // State cục bộ để lưu giá trị khi kéo thanh trượt
  const [localAssumptions, setLocalAssumptions] = useState({
    pctSalaryGrowth: 7,
    pctHouseGrowth: 10,
    pctInvestmentReturn: 11,
  });
  // ---------------------------------------

  const { isSignedIn, userId } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Đồng bộ dữ liệu từ planState vào localAssumptions khi vào màn hình này
  useEffect(() => {
    if (currentSection === 'assumptions') {
      setLocalAssumptions({
        pctSalaryGrowth: planState.salaryGrowthRate ?? 7,
        pctHouseGrowth: planState.propertyGrowthRate ?? 10,
        pctInvestmentReturn: planState.investmentReturnRate ?? 11,
      });
    }
  }, [currentSection, planState.salaryGrowthRate, planState.propertyGrowthRate, planState.investmentReturnRate]);

  // Tính toán chartData dựa trên bước hiện tại của Wizard và giá trị localAssumptions
  const chartData = useMemo(() => {
    // Xác định key dựa trên bước hiện tại
    let currentDataKey: DataKey = 'pctSalaryGrowth';
    if (assumptionWizardStep === 1) currentDataKey = 'pctHouseGrowth';
    if (assumptionWizardStep === 2) currentDataKey = 'pctInvestmentReturn';

    // Tạo object plan tạm thời khớp với cấu trúc mà hàm tính toán mong đợi
    const tempPlan = {
      ...planState,
      // Map các trường từ OnboardingPlanState sang Plan
      // Sử dụng giá trị TỨC THỜI từ localAssumptions để biểu đồ cập nhật ngay khi kéo
      pctSalaryGrowth: localAssumptions.pctSalaryGrowth,
      pctHouseGrowth: localAssumptions.pctHouseGrowth,
      pctInvestmentReturn: localAssumptions.pctInvestmentReturn,
      
      // Mock relation familySupport vì hàm tính toán truy cập vào plan.familySupport.xxx
      familySupport: {
        coApplicantMonthlyIncome: planState.coApplicantMonthlyIncome || 0,
        monthlyOtherIncome: planState.monthlyOtherIncome || 0,
      },
      
      // Chuyển đổi đơn vị nếu cần (Billions -> Millions)
      targetHousePriceN0: (planState.targetHousePriceN0 || 0) * 1000,
      
      // Đảm bảo có năm mua nhà để tính toán tâm biểu đồ
      confirmedPurchaseYear: new Date().getFullYear() + (planState.yearsToPurchase || 3),
      
      // Đảm bảo các trường số học có giá trị
      initialSavings: planState.initialSavings || 0,
      userMonthlyIncome: planState.userMonthlyIncome || 0,
      monthlyLivingExpenses: planState.monthlyLivingExpenses || 0,
      
      // Thêm ID để tránh lỗi nếu component con dùng plan.id
      id: planId, 
    };

    return generateAccumulationMilestones(tempPlan as any as PlanWithDetails, currentDataKey);
  }, [planState, localAssumptions, assumptionWizardStep, planId]);

  // Handlers cho Assumption (Xử lý khi kéo slider)
  const handleAssumptionSliderChange = (key: string, value: number) => {
    setLocalAssumptions(prev => ({ ...prev, [key]: value }));
  };

  // Xử lý khi bấm Next ở từng bước giả định
  const handleAssumptionNext = () => {
    if (assumptionWizardStep < 2) {
      setAssumptionWizardStep(prev => prev + 1);
    } else {
      // Đã xong các bước slider -> Lưu lại vào planState chính
      setPlanState(prev => ({
        ...prev,
        salaryGrowthRate: localAssumptions.pctSalaryGrowth,
        propertyGrowthRate: localAssumptions.pctHouseGrowth,
        investmentReturnRate: localAssumptions.pctInvestmentReturn
      }));
      // Chuyển sang màn hình kết quả
      setAssumptionInternalStep("loading");
      setTimeout(() => setAssumptionInternalStep("result"), 500);
    }
  };

  const handleAssumptionPrev = () => {
    if (assumptionWizardStep > 0) {
      setAssumptionWizardStep(prev => prev - 1);
    } else {
      setAssumptionInternalStep("intro");
    }
  };

  const handleQuickCheckCompleted = async (data: {
    onboardingData: Partial<OnboardingPlanState>;
    quickCheckResult: QuickCheckResultPayload;
  }) => {
    console.log("[OnboardingFlow] QuickCheck completed", { isSignedIn, userId });
    const finalOnboardingData = { ...planState, ...data.onboardingData };
    setPlanState(finalOnboardingData);

    if (isSignedIn && userId) {
      console.log("[OnboardingFlow] User is signed in, creating/updating plan...");
      setIsLoading(true);

      const result = await createPlanFromOnboarding(finalOnboardingData);
      console.log("[OnboardingFlow] createPlanFromOnboarding result:", result);

      if (result.success && result.planId) {
        const redirectUrl = result.nextStepUrl || `/plan/${result.planId}/familysupport`;
        console.log("[OnboardingFlow] Redirecting to:", redirectUrl);
        router.push(redirectUrl);
      } else {
        console.error("[OnboardingFlow] Failed to create plan:", result.error);
        toast.error(result.error || "Không thể tạo kế hoạch. Vui lòng thử lại.");
        setIsLoading(false);
      }
    } else {
      console.log("[OnboardingFlow] Guest user, saving to localStorage");
      localStorage.setItem("pendingOnboardingPlan", JSON.stringify(finalOnboardingData));
      setCurrentSection('signupPrompt');
    }
  };

  const handleFamilySupportCompleted = (data: Partial<OnboardingPlanState>) => {
    setPlanState(prev => ({ ...prev, ...data }));
    setCurrentSection('spending');
  };

  const handleSpendingCompleted = (data: Partial<OnboardingPlanState>) => {
    setPlanState(prev => ({ ...prev, ...data }));
    setCurrentSection('assumptions');
  };

  const handleBackFromPrompt = () => {
    setCurrentSection('quickCheck');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingStep message="Đang khởi tạo kế hoạch của bạn..." percentage={100} />
      </div>
    );
  }

  const renderSection = () => {
    switch (currentSection) {
      case 'quickCheck':
        return <QuickCheck planId={planId} initialData={planState} onCompleted={handleQuickCheckCompleted} initialStep={initialStep} />;
      case 'signupPrompt':
        return <SignupPrompt planData={planState} onBack={handleBackFromPrompt} />;
      case 'familySupport':
        return <FamilySupport initialData={planState} familySupport={planState} planId={planId} onSubmit={handleFamilySupportCompleted} />;
      case 'spending':
        return <Spending initialData={planState} plan={planState} onCompleted={handleSpendingCompleted} planId={planId} isEditMode={false} />;
      case 'assumptions':
        // SỬA: Truyền đầy đủ props và logic vào component Assumption
        return <Assumption 
          plan={{ ...planState, id: planId } as any as Plan} // Cast để khớp type
          step={assumptionInternalStep} 
          setStep={setAssumptionInternalStep} 
          assumptionStep={assumptionWizardStep} 
          onNext={handleAssumptionNext} 
          onPrev={handleAssumptionPrev} 
          result={null} 
          assumptions={localAssumptions} // Truyền giá trị thực tế
          onSliderChange={handleAssumptionSliderChange} // Truyền hàm xử lý
          chartData={chartData} // Truyền dữ liệu biểu đồ đã tính
          onConfirm={() => {}} 
          onFinalChoice={() => {}} 
        />;
      default:
        return <QuickCheck onCompleted={handleQuickCheckCompleted} initialStep={initialStep} />;
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#121212] text-white">
      <div className="w-full max-w-5xl flex flex-col h-full flex-1">
        {renderSection()}
      </div>
    </div>
  );
}
