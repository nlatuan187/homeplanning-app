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
import { OnboardingProgress } from "@prisma/client";
import { completeOnboardingSection } from "@/actions/onboardingProgress";

const familySupportQuestions: Question[] = [
    { key: 'hasFinancialPartner', text: 'Bạn có người đồng hành tài chính (vợ/chồng) khi mua nhà không?', type: 'options', options: [{label: 'Có', value: true}, {label: 'Không', value: false}] },
    // @ts-ignore
    { key: 'partnerMonthlyIncome', text: 'Lương hàng tháng của vợ/chồng bạn là bao nhiêu?', type: 'number', unit: 'triệu VNĐ', condition: (ans: any) => ans.hasFinancialPartner === true },
    { key: 'otherMonthlyIncome', text: 'Tổng thu nhập khác (ngoài lương) của bạn và người đồng hành tài chính mỗi tháng là bao nhiêu?', type: 'number', unit: 'triệu VNĐ' },
    { key: 'hasFamilySupport', text: 'Bạn có nhận được hỗ trợ tài chính từ gia đình (bố mẹ, họ hàng,...) không?', type: 'options', options: [{label: 'Có', value: true}, {label: 'Không', value: false}] },
    // @ts-ignore
    { key: 'familySupportType', text: 'Đây là khoản cho TẶNG hay cho VAY?', type: 'options', options: [{label: 'Cho tặng (không cần hoàn lại)', value: 'GIFT'}, {label: 'Cho vay (cần hoàn lại)', value: 'LOAN'}], condition: (ans: any) => ans.hasFamilySupport === true },
    // @ts-ignore
    { key: 'familySupportGiftAmount', text: 'Số tiền được tặng (triệu VNĐ)', type: 'number', unit: 'triệu VNĐ', condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'GIFT' },
    // @ts-ignore
    { key: 'familySupportGiftTiming', text: 'Khi nào bạn sẽ nhận được số tiền này?', type: 'options', options: [{label: 'Ngay bây giờ (có thể mang đi đầu tư để tích luỹ)', value: 'NOW'}, {label: 'Khi thanh toán mua nhà', value: 'AT_PURCHASE'}], condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'GIFT' },
    // @ts-ignore
    { key: 'familySupportLoanAmount', text: 'Số tiền đi vay (triệu VNĐ)', type: 'number', unit: 'triệu VNĐ', condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'LOAN' },
    // @ts-ignore
    { key: 'familySupportLoanInterest', text: 'Lãi suất cho vay (%)', type: 'number', unit: '%', condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'LOAN' },
    // @ts-ignore
    { key: 'familySupportLoanRepayment', text: 'Bạn sẽ trả nợ theo hình thức nào', type: 'options', options: [{label: 'Trả góp đều hàng tháng', value: 'MONTHLY'}, {label: 'Trả một lần vào cuối kỳ ', value: 'LUMP_SUM'}], condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'LOAN' },
    // @ts-ignore
    { key: 'familySupportLoanTerm', text: 'Thời hạn của khoản vay này là bao lâu (năm)', type: 'number', unit: 'năm', condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'LOAN' },
];

interface FamilySupportProps {
  planId: string;
  onboardingProgress: OnboardingProgress | null;
}

type Step = "intro" | "form" | "loading" | "result";



interface RecalculationResult {
    success: boolean;
    message: string;
    earliestPurchaseYear?: number;
    error?: string;
    hasImproved?: boolean;
}

export default function FamilySupport({
  initialData,
  planId,
  onCompleted,
}: FamilySupportProps) {
  const [step, setStep] = useState<Step>("intro");
  const [result, setResult] = useState<RecalculationResult | null>(null);
  const router = useRouter();

  const handleSubmit = async (formData: Partial<OnboardingPlanState>) => {
    setStep("loading");
    const fullData = { ...initialData, ...formData };

    const familySupportPayload = {
      hasFinancialPartner: fullData.hasFinancialPartner,
      partnerMonthlyIncome: (fullData.partnerMonthlyIncome || 0),
      otherMonthlyIncome: (fullData.otherMonthlyIncome || 0),
      hasFamilySupport: fullData.hasFamilySupport,
      familySupportType: fullData.familySupportType,
      familySupportGiftAmount: (fullData.familySupportGiftAmount || 0),
      familySupportGiftTiming: fullData.familySupportGiftTiming,
      familySupportLoanAmount: (fullData.familySupportLoanAmount || 0),
      familySupportLoanInterest: fullData.familySupportLoanInterest,
      familySupportLoanRepayment: fullData.familySupportLoanRepayment,
      familySupportLoanTerm: fullData.familySupportLoanTerm,
    };

    const result = await updateAndRecalculateFamilySupport(planId, familySupportPayload);
    
    if (result.success) {
      setResult(result as RecalculationResult);
      setStep("result");
    } else {
      toast.error(result.error || "Có lỗi xảy ra, vui lòng thử lại.");
      setStep("form"); // Go back to form on error
    }
  };

  const handleContinue = () => {
    // This is where you might call onCompleted or navigate
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
          <Button
            onClick={() => setStep("form")}
            className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-sm shadow-lg transition-transform transform active:scale-95"
          >
            Đi tìm nguồn lực hỗ trợ
          </Button>
        </div>
      </>
    );
  }

  console.log("result", result)

  if (step === "loading") {
      return (
        <div className="max-w-5xl mx-auto fixed inset-0 pt-2 flex flex-col z-10 bg-slate-950">
            <LoadingStep title="Nguồn lực hỗ trợ" />
        </div>
      )
  }

  if (step === "result" && result) {
      return <ResultStep 
        title="Nguồn lực hỗ trợ"
        message={result.message}
        earliestPurchaseYear={result.earliestPurchaseYear}
        onContinue={handleContinue}
        hasImproved={result.hasImproved} // 🔥 Pass prop này
      />
  }

  return (
    <div className="max-w-5xl mx-auto fixed inset-0 pt-2 flex flex-col z-10 bg-slate-950">
        <MultiStepQuestionForm 
            questions={familySupportQuestions} 
            onSubmit={handleSubmit}
            title="Nguồn lực hỗ trợ"
            subtitle="Tôi có thể mua được nhà sớm hơn không?"
        />
    </div>
  );
}
