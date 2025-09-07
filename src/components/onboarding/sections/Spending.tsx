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
import { updateSpendingAndRecalculate } from "@/actions/updateSpendingAndRecalculate";

const familySupportQuestions: Question[] = [
    { key: 'monthlyNonHousingDebt', text: 'Số tiền bạn đang trả cho các khoản vay hàng tháng khác?', type: 'number', unit: 'triệu VNĐ' },
    // @ts-ignore
    { key: 'currentAnnualInsurancePremium', text: 'Chi phí bạn đang trả cho bảo hiểm nhân thọ hàng năm là bao nhiêu?', type: 'number', unit: 'triệu VNĐ' },
];

interface FamilySupportProps {
  initialData: Partial<OnboardingPlanState>;
  planId: string;
  onCompleted: (data: Partial<OnboardingPlanState>) => void;
}

type Step = "intro" | "form" | "loading" | "result";

interface RecalculationResult {
    success: boolean;
    message: string;
    earliestPurchaseYear?: number;
    error?: string;
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

    const spendingPayload = {
      monthlyNonHousingDebt: fullData.monthlyNonHousingDebt,
      currentAnnualInsurancePremium: fullData.currentAnnualInsurancePremium,
    };

    const result = await updateSpendingAndRecalculate(planId, spendingPayload);
    
    if (result.success) {
      setResult(result);
      setStep("result");
    } else {
      toast.error(result.error || "Có lỗi xảy ra, vui lòng thử lại.");
      setStep("form"); // Go back to form on error
    }
  };

  const handleContinue = () => {
    // This is where you might call onCompleted or navigate
    router.push(`/plan/${planId}/assumption`);
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
            onClick={() => setStep("form")}
            className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-xl shadow-lg transition-transform transform active:scale-95"
          >
            Tôi sẵn sàng rồi
          </Button>
        </div>
      </>
    );
  }

  if (step === "loading") {
      return (
        <div className="max-w-5xl mx-auto fixed inset-0 pt-2 flex flex-col z-10 bg-slate-950">
            <LoadingStep title="Dòng tiền đi ra" />
        </div>
      )
  }

  if (step === "result" && result) {
      return <ResultStep 
        title="Dòng tiền đi ra "
        message={result.message}
        earliestPurchaseYear={result.earliestPurchaseYear}
        onContinue={handleContinue}
      />
  }

  return (
    <div className="max-w-5xl mx-auto fixed inset-0 pt-2 flex flex-col z-10 bg-slate-950">
        <MultiStepQuestionForm 
            questions={familySupportQuestions} 
            onSubmit={handleSubmit}
            title="Dòng tiền đi ra"
            subtitle="Thời gian mua nhà có ảnh hưởng không"
        />
    </div>
  );
}
