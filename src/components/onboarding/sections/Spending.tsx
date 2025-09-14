"use client";

import { useState } from "react";
import { OnboardingPlanState } from "../types";
import MultiStepQuestionForm, {
  Question,
} from "../shared/MultiStepQuestionForm";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import LoadingStep from "../shared/LoadingStep";
import ResultStep from "../shared/ResultStep";
import { updateSpendingAndRecalculate } from "@/actions/updateSpendingAndRecalculate";
import { RecalculationResult } from "../shared/ResultStep";
import { updateOnboardingSectionProgress } from "@/actions/onboardingActions";
import { OnboardingSectionState } from "@prisma/client";
import { ArrowLeftIcon } from "lucide-react";


interface SpendingProps {
  initialData: Partial<OnboardingPlanState>;
  plan: OnboardingPlanState;
  planId: string;
  onCompleted: (data: Partial<OnboardingPlanState>) => void;
  isEditMode?: boolean;
  onBackFromFirst?: () => void;
}

type Step = "intro" | "form1" | "analysis" | "form2" | "loading" | "result";

export default function Spending({
  initialData,
  plan,
  planId,
  onCompleted,
  isEditMode = false,
  onBackFromFirst,
}: SpendingProps) {
  const [step, setStep] = useState<Step>("intro");
  const [result, setResult] = useState<RecalculationResult | null>(null);
  const [formData, setFormData] = useState<Partial<OnboardingPlanState>>({});
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  const spendingQuestionsPart1: Question[] = [
    { key: 'monthlyNonHousingDebt', text: 'Số tiền bạn đang trả cho các khoản vay hàng tháng khác?', type: 'number', unit: 'triệu VNĐ' },
  ];

  const spendingQuestionsPart2: Question[] = [
    // @ts-ignore
    { key: 'currentAnnualInsurancePremium', text: 'Chi phí bạn đang trả cho bảo hiểm nhân thọ hàng năm là bao nhiêu?', type: 'number', unit: 'triệu VNĐ' },
    { 
      key: 'currentAnnualOtherExpenses', 
      text: 'Chi tiêu của cả GIA ĐÌNH hàng tháng là bao nhiêu (trừ chi tiêu CÁ NHÂN)?', 
      type: 'number', 
      unit: 'triệu VNĐ',  
      condition: () => plan.hasFamilySupport === true
    },
    { key: 'hasNewChild', text: 'Bạn có dự định sinh thêm em bé không?', type: 'options', options: [{label: 'Có', value: true}, {label: 'Không', value: false}] },
    {
      key: "yearToHaveChild",
      text: "Bạn dự định mua nhà vào thời điểm nào?",
      type: "options",
      options: [
        { label: `Năm nay (${currentYear})`, value: currentYear },
        { label: `1 năm nữa (${currentYear + 1})`, value: currentYear + 1 },
        { label: `2 năm nữa (${currentYear + 2})`, value: currentYear + 2 },
      ],
      condition: (ans: any) => ans.hasNewChild === true,
    },
  ];

  const handleContinue = () => {
    updateOnboardingSectionProgress(planId, "spending", OnboardingSectionState.COMPLETED);
    updateOnboardingSectionProgress(planId, "assumption", OnboardingSectionState.IN_PROGRESS);
    router.push(`/plan/${planId}/assumption`);
  }

  const defaultValues: Partial<OnboardingPlanState> = {
    monthlyNonHousingDebt: plan.monthlyNonHousingDebt,
    currentAnnualInsurancePremium: plan.currentAnnualInsurancePremium,
    currentAnnualOtherExpenses: plan.currentAnnualOtherExpenses,
    hasNewChild: plan.hasNewChild,
    yearToHaveChild: plan.yearToHaveChild,
  };

  const handleSubmitPart1 = (data: Partial<OnboardingPlanState>) => {
    setFormData({ ...formData, ...data });
    setStep("analysis");
  };

  const handleContinueFromAnalysis = () => {
    setStep("form2");
  };

  const handleSubmit = async (data: Partial<OnboardingPlanState>) => {
    const finalData = { ...formData, ...data };
    // THÊM LẠI KHỐI LỆNH NÀY
    // Nếu đang ở luồng chỉnh sửa, chỉ cần thu thập dữ liệu và báo cáo lên cha
    if (isEditMode) {
      onCompleted(finalData);
      
      return; // Dừng hàm tại đây
    }

    // --- Logic của luồng onboarding gốc giữ nguyên ---
    setStep("loading");
    const fullData = { ...initialData, ...finalData };

    const spendingPayload = {
      monthlyNonHousingDebt: fullData.monthlyNonHousingDebt,
      currentAnnualInsurancePremium: fullData.currentAnnualInsurancePremium,
      currentAnnualOtherExpenses: fullData.currentAnnualOtherExpenses,
      hasNewChild: fullData.hasNewChild,
      yearToHaveChild: fullData.yearToHaveChild,
    };

    const result = await updateSpendingAndRecalculate(plan, spendingPayload);
    
    if (result.success) {
      setResult(result as RecalculationResult);
      setStep("result");
    } else {
      toast.error(result.error || "Có lỗi xảy ra, vui lòng thử lại.");
      setStep("form1"); // Go back to form on error
    }
  };

  if (step === "intro") {
    return (
      <>
        <div
          className="max-w-5xl mx-auto fixed inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: "url('/onboarding/section3bg.png')" }}
        />
        <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col p-8 z-10">
          <div className="flex-grow flex flex-col items-center justify-center text-center">
            <div className="text-white/80 font-semibold mb-8">
                Mục 2/3
            </div>
            <Image
              src="/icons/suitcase 3.png"
              alt="Dòng tiền đi ra"
              width={80}
              height={80}
              className="mb-6"
            />
            <h1 className="text-4xl max-md:text-3xl font-bold text-white mb-3">
                Dòng tiền đi ra
            </h1>
            <p className="text-lg text-white/90 max-w-sm">
                Ngồi vững ghế nhé, có thể năm mua nhà sớm nhất của bạn sẽ bị đẩy lùi đi đó!            
            </p>
          </div>
          <Button
            onClick={() => {setStep("form1"); updateOnboardingSectionProgress(planId, "spending", OnboardingSectionState.IN_PROGRESS);}}
            className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-sm shadow-lg transition-transform transform active:scale-95"
          >
            Tôi sẵn sàng rồi
          </Button>
        </div>
      </>
    );
  }

  if (step === "form1") {
    return (
      <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-slate-950">
        <MultiStepQuestionForm
          key="spending1"
          questions={spendingQuestionsPart1}
          onSubmit={handleSubmitPart1}
          title="Dòng tiền đi ra"
          subtitle="Tiếp tục"
          defaultValues={defaultValues}
          onBackFromFirst={() => setStep("intro")}
        />
      </div>
    );
  }

  if (step === "analysis") {
    return (
      <div className="flex flex-col h-full flex-grow max-w-5xl mx-auto text-white">
        <div className="relative flex items-center h-10 mb-4">
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStep("form1")}
            >
              <ArrowLeftIcon className="h-12 w-12" />
            </Button>
          </div>
        </div>
        <div className="flex-grow flex flex-col items-center text-center pb-17 px-4">
          <p className="text-white/80 font-semibold mb-4">Bạn có biết?</p>
          <h2 className="text-2xl font-bold mb-6 max-w-sm">Một trong những lý do phổ biến nhất khiến việc mua nhà chậm lại là có em bé ngoài dự kiến</h2>
          <Image
            src="/onboarding/baby.png" // Placeholder image
            alt="Analysis"
            width={150}
            height={150}
            className="mb-6"
          />
          <p className="text-white/90 max-w-md">
            Hãy cân nhắc thật kỹ về thời điểm sinh em bé để đảm bảo bạn vững vàng nhất về tài chính cũng như kế hoạch mua nhà không bị thay đổi đột ngột ngoài dự kiến.
          </p>
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto p-4">
            <Button
              onClick={handleContinueFromAnalysis}
              className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-sm shadow-lg transition-transform transform active:scale-95"
            >
              Tiếp tục
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "form2") {
    return (
      <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-slate-950">
        <MultiStepQuestionForm
          key="spending2"
          questions={spendingQuestionsPart2}
          onSubmit={handleSubmit}
          title="Dòng tiền đi ra"
          subtitle="Thời gian mua nhà có ảnh hưởng không"
          defaultValues={formData}
          onBackFromFirst={() => setStep("analysis")}
        />
      </div>
    );
  }

  if (step === "loading" && !isEditMode) {
      return (
        <div className="max-w-5xl mx-auto fixed inset-0 pt-2 flex flex-col z-10 bg-slate-950">
            <LoadingStep title="Dòng tiền đi ra" message="Tính toán các dòng tiền đi ra" percentage={100}/>
        </div>
      )
  }

  if (step === "result" && result && !isEditMode) {
      return <ResultStep 
        plan={result.plan}
        title="Dòng tiền đi ra "
        message={result.message}
        earliestPurchaseYear={result.earliestPurchaseYear}
        onContinue={handleContinue}
        hasWorsened={result.hasWorsened} // 🔥 Pass prop này để ResultStep biết cách hiển thị
      />
  }

  return (
    <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-slate-950">
        <MultiStepQuestionForm 
            questions={spendingQuestionsPart2} 
            onSubmit={handleSubmit}
            title="Dòng tiền đi ra"
            subtitle="Thời gian mua nhà có ảnh hưởng không"
            defaultValues={defaultValues}
            onBackFromFirst={onBackFromFirst}
        />
    </div>
  );
}
