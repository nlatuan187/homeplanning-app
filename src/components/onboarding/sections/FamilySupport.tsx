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
import { updateAndRecalculateFamilySupport } from "@/actions/updateAndRecalculateFamilySupport";
import LoadingStep from "../shared/LoadingStep";
import ResultStep from "../shared/ResultStep";
import { FamilyGiftTiming, FamilyLoanRepaymentType, FamilySupportType, OnboardingSectionState, Plan } from "@prisma/client";
import { updateOnboardingSectionProgress } from "@/actions/onboardingActions";
import { ArrowLeftIcon } from "lucide-react";

const familySupportQuestionsPart1: Question[] = [
    { 
      key: 'monthlyOtherIncome', 
      text: (ans) =>
        ans.hasCoApplicant
          ? 'Tổng thu nhập khác (ngoài lương) của bạn và người đồng hành tài chính mỗi tháng là bao nhiêu?'
          : 'Tổng thu nhập khác (ngoài lương) của bạn mỗi tháng là bao nhiêu?', 
      type: 'number', unit: 'triệu VNĐ' },
];

const familySupportQuestionsPart2: Question[] = [
    { key: 'hasFamilySupport', text: 'Bạn có nhận được hỗ trợ tài chính từ gia đình (bố mẹ, họ hàng,...) không?', type: 'options', options: [{label: 'Có', value: true}, {label: 'Không', value: false}] },
    { 
      key: 'familySupportType', 
      text: 'Đây là khoản cho TẶNG hay cho VAY?', 
      type: 'options', 
      options: [{label: 'Cho tặng (không cần hoàn lại)', value: 'GIFT'}, {label: 'Cho vay (cần hoàn lại)', 
        value: 'LOAN'}], condition: (ans: any) => ans.hasFamilySupport === true },
    // @ts-ignore
    { key: 'familySupportGiftAmount', 
      text: 'Số tiền được tặng (triệu VNĐ)', 
      type: 'number', 
      unit: 'triệu VNĐ', 
      condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'GIFT' },
    // @ts-ignore
    { key: 'familySupportGiftTiming', text: 'Khi nào bạn sẽ nhận được số tiền này?', type: 'options', options: [{label: 'Ngay bây giờ (có thể mang đi đầu tư để tích luỹ)', value: 'NOW'}, {label: 'Khi thanh toán mua nhà', value: 'AT_PURCHASE'}], condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'GIFT' },
    // @ts-ignore
    { key: 'familySupportLoanAmount', text: 'Số tiền đi vay (triệu VNĐ)', type: 'number', unit: 'triệu VNĐ', condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'LOAN' },
    // @ts-ignore
    { key: 'familySupportLoanInterest', text: 'Lãi suất cho vay (%)', type: 'number', unit: '%', condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'LOAN' },
    // @ts-ignore
    { key: 'familySupportLoanRepayment', text: 'Bạn sẽ trả nợ theo hình thức nào?', type: 'options', options: [{label: 'Trả góp đều hàng tháng', value: 'MONTHLY'}, {label: 'Trả một lần vào cuối kỳ ', value: 'LUMP_SUM'}], condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'LOAN' },
    // @ts-ignore
    { key: 'familySupportLoanTerm', text: 'Thời hạn của khoản vay này là bao lâu (năm)', type: 'number', unit: 'năm', condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'LOAN' },
];

interface FamilySupportProps {
  initialData: OnboardingPlanState;
  familySupport: OnboardingPlanState;
  planId: string;
  onCompleted: (data: Partial<OnboardingPlanState>) => void;
  isEditMode?: boolean; // <-- THÊM PROP MỚI
  onBackFromFirst?: () => void;
}

type Step = "intro" | "form1" | "analysis" | "form2" | "loading" | "result";

interface RecalculationResult {
  plan: Plan;
  success: boolean;
  message: string;
  earliestPurchaseYear?: number;
  error?: string;
  hasImproved?: boolean;
}

export default function FamilySupport({
  initialData,
  familySupport,
  planId,
  onCompleted,
  isEditMode = false, // <-- Gán giá trị mặc định
  onBackFromFirst,
}: FamilySupportProps) {
  const [step, setStep] = useState<Step>("intro");
  const [result, setResult] = useState<RecalculationResult | null>(null);
  const [formData, setFormData] = useState<Partial<OnboardingPlanState>>({});
  const router = useRouter();

  const defaultValues: Partial<OnboardingPlanState> = {
    coApplicantMonthlyIncome: familySupport?.coApplicantMonthlyIncome ?? 0,
    monthlyOtherIncome: familySupport?.monthlyOtherIncome ?? 0,
    hasFamilySupport: familySupport?.hasFamilySupport ?? false,
    familySupportType: familySupport?.familySupportType as FamilySupportType,
    familySupportGiftAmount: (familySupport?.familySupportGiftAmount as number) ?? 0,
    familySupportGiftTiming: familySupport?.familySupportGiftTiming as FamilyGiftTiming,
    familySupportLoanAmount: (familySupport?.familySupportLoanAmount as number) ?? 0,
    familySupportLoanInterest: (familySupport?.familySupportLoanInterest as number) ?? 0,
    familySupportLoanRepayment: familySupport?.familySupportLoanRepayment as FamilyLoanRepaymentType,
    familySupportLoanTerm: (familySupport?.familySupportLoanTerm as number) ?? 0,
  };

  const handleSubmitPart1 = (data: Partial<OnboardingPlanState>) => {
    const newFormData = { ...formData, ...data };
    setFormData(newFormData);
    setStep("analysis");
  };

  const handleContinueFromAnalysis = () => {
    setStep("form2");
  };

  const handleSubmit = async (data: Partial<OnboardingPlanState>) => {
    const finalData = { ...formData, ...data };

    // Nếu đang ở luồng chỉnh sửa, chỉ cần thu thập dữ liệu và báo cáo lên cha
    if (isEditMode) {
      onCompleted(finalData);
      return; // Dừng hàm tại đây
    }

    // --- Logic của luồng onboarding gốc giữ nguyên ---
    setStep("loading");
    const fullData = { ...initialData, ...finalData };

    const familySupportPayload = {
      coApplicantMonthlyIncome: (fullData.coApplicantMonthlyIncome || 0),
      monthlyOtherIncome: (fullData.monthlyOtherIncome || 0),
      hasFamilySupport: (fullData.hasFamilySupport || false),
      familySupportType: fullData.familySupportType,
      familySupportGiftTiming: fullData.familySupportGiftTiming,
      familySupportAmount: (fullData.familySupportLoanAmount || fullData.familySupportGiftAmount),
      familyLoanInterestRate: fullData.familySupportLoanInterest,
      familyLoanRepaymentType: fullData.familySupportLoanRepayment,
      familyLoanTermYears: fullData.familySupportLoanTerm,
    };

    const result = await updateAndRecalculateFamilySupport(planId, familySupportPayload);
    
    if (result.success) {
      setResult(result as RecalculationResult);
      setStep("result");
    } else {
      toast.error(result.error || "Có lỗi xảy ra, vui lòng thử lại.");
      setStep("form1"); // Go back to form on error
    }
  };

  const handleContinue = () => {
    // This is where you might call onCompleted or navigate
    updateOnboardingSectionProgress(planId, "familySupport", OnboardingSectionState.COMPLETED);
    router.push(`/plan/${planId}/spending`);
  };

  if (step === "intro") {
    return (
      <>
        <div
          className="max-w-5xl mx-auto fixed inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: "url('/onboarding/section2bg.png')" }}
        />
        <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col p-8 z-10">
          <div className="flex-grow flex flex-col items-center justify-center text-center">
            <div className="text-white/80 font-semibold mb-8">
                Mục 1/3
            </div>
            <Image
              src="/icons/suitcase 2.png"
              alt="Nguồn lực hỗ trợ"
              width={80}
              height={80}
              className="mb-6"
            />
            <h1 className="text-4xl max-md:text-3xl font-bold text-white mb-3">
              Nguồn lực hỗ trợ
            </h1>
            <p className="text-lg text-white/90 max-w-sm">
              Thật tuyệt vời nếu bạn có người đồng hành hoặc sự hỗ trợ tài chính. Hãy cùng xem những nguồn lực này có giúp bạn mua nhà sớm hơn không nhé!
            </p>
          </div>
          <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 z-10">
            <Button
              onClick={() => {setStep("form1"); updateOnboardingSectionProgress(planId, "familySupport", OnboardingSectionState.IN_PROGRESS);}}
              className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-sm shadow-lg transition-transform transform active:scale-95"
            >
              Đi tìm nguồn lực hỗ trợ
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (step === "form1") {
    return (
      <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-slate-950">
        <MultiStepQuestionForm
          key="familySupport1"
          questions={familySupportQuestionsPart1}
          onSubmit={handleSubmitPart1}
          title="Nguồn lực hỗ trợ"
          subtitle="Tiếp tục"
          defaultValues={defaultValues}
          onBackFromFirst={() => setStep("intro")}
        />
      </div>
    );
  }

  if (step === "analysis") {
    return (
      <>
        <div className="flex flex-col h-full flex-grow max-w-5xl mx-auto">
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
            <h2 className="text-2xl font-bold mb-6">Hỗ trợ từ người thân không nhất thiết phải là một khoản cho không!</h2>
            <Image
              src="/onboarding/analysis.png"
              alt="Analysis"
              width={400}
              height={300}
              className="mb-6"
            />            
            <p className="text-white/90 max-w-5xl">
              Bằng cách định lượng rõ tiềm năng lợi nhuận và rủi ro của cơ hội mua nhà, bạn có thể mời họ 'cùng đầu tư' và chia sẻ lợi nhuận. Đây là một cách huy động vốn rất thông minh.            
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
      </>
    );
  }

  if (step === "form2") {
    return (
      <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-slate-950">
        <MultiStepQuestionForm
          key="familySupport2"
          questions={familySupportQuestionsPart2}
          onSubmit={handleSubmit}
          title="Nguồn lực hỗ trợ"
          subtitle="Tôi có thể mua được nhà sớm hơn không?"
          defaultValues={formData}
          onBackFromFirst={() => setStep("analysis")}
        />
      </div>
    );
  }

  if (step === "loading" && familySupport) {
      return (
        <div className="max-w-5xl mx-auto fixed inset-0 pt-2 flex flex-col z-10 bg-slate-950">
            <LoadingStep title="Nguồn lực hỗ trợ" message="Tính toán các dòng tiền hỗ trợ"/>
        </div>
      )
  }

  if (step === "result" && result && familySupport) {
      return <ResultStep 
        plan={result.plan}
        title="Nguồn lực hỗ trợ"
        message={result.message}
        earliestPurchaseYear={result.earliestPurchaseYear}
        onContinue={handleContinue}
        hasImproved={result.hasImproved}
      />
  }

  return (
    <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-slate-950">
        <MultiStepQuestionForm 
          questions={familySupportQuestionsPart2} 
          key="familySupport2"
          onSubmit={handleSubmit}
          title="Nguồn lực hỗ trợ"
          subtitle="Tôi có thể mua được nhà sớm hơn không?"
          defaultValues={defaultValues}
          onBackFromFirst={onBackFromFirst}
        />
    </div>
  );
}

