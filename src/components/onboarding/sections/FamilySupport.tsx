"use client";

import { useState, useMemo, useCallback } from "react";
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
import ProgressBar from "../shared/ProgressBar";
import { motion } from "framer-motion";

interface FamilySupportProps {
  initialData: OnboardingPlanState;
  familySupport: OnboardingPlanState;
  planId: string;
  onSubmit: (data: Partial<OnboardingPlanState>) => void;
  isEditMode?: boolean;
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
  onSubmit,
  isEditMode = false,
  onBackFromFirst,
}: FamilySupportProps) {
  const [step, setStep] = useState<Step>("intro");
  const [result, setResult] = useState<RecalculationResult | null>(null);
  const [formData, setFormData] = useState<Partial<OnboardingPlanState>>(initialData);
  const [progress, setProgress] = useState({ current: 0, total: 1 });
  const [form1InitialIndex, setForm1InitialIndex] = useState(0);
  const router = useRouter();

  console.log("initialData", familySupport);

  const defaultValues: Partial<OnboardingPlanState> = useMemo(() => ({
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
  }), [familySupport]);

  console.log("formData", planId);

  const familySupportQuestionsPart1: Question[] = useMemo(() => [
    {
      key: 'monthlyOtherIncome',
      text: (ans) =>
        ans.hasCoApplicant
          ? 'Tổng thu nhập khác (ngoài lương) của bạn và người đồng hành tài chính mỗi tháng là bao nhiêu? (đơn vị: triệu VNĐ)'
          : 'Tổng thu nhập khác (ngoài lương) của bạn mỗi tháng là bao nhiêu? (đơn vị: triệu VNĐ)',
      type: 'number', unit: 'triệu VNĐ'
    },
  ], []);

  const familySupportQuestionsPart2: Question[] = useMemo(() => [
    { key: 'hasFamilySupport', text: 'Bạn có nhận được hỗ trợ tài chính từ gia đình (bố mẹ, họ hàng,...) không?', type: 'options', options: [{ label: 'Có', value: true }, { label: 'Không', value: false }] },
    {
      key: 'familySupportType',
      text: 'Đây là khoản cho TẶNG hay cho VAY?',
      type: 'options',
      options: [{ label: 'Cho tặng (không cần hoàn lại)', value: 'GIFT' }, {
        label: 'Cho vay (cần hoàn lại)',
        value: 'LOAN'
      }], condition: (ans: any) => ans.hasFamilySupport === true
    },
    {
      key: 'familySupportGiftAmount',
      text: 'Số tiền được tặng (đơn vị: triệu VNĐ)',
      type: 'number',
      unit: 'triệu VNĐ',
      condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'GIFT'
    },
    { key: 'familySupportGiftTiming', text: 'Khi nào bạn sẽ nhận được số tiền này?', type: 'options', options: [{ label: 'Ngay bây giờ (có thể mang đi đầu tư để tích luỹ)', value: 'NOW' }, { label: 'Khi thanh toán mua nhà', value: 'AT_PURCHASE' }], condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'GIFT' },
    { key: 'familySupportLoanAmount', text: 'Số tiền đi vay (đơn vị: triệu VNĐ)', type: 'number', unit: 'triệu VNĐ', condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'LOAN' },
    { key: 'familySupportLoanInterest', text: 'Lãi suất cho vay (đơn vị: %/năm) (Nếu vay không cần trả lãi, vui lòng nhập 0)', type: 'number', unit: '%', condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'LOAN' },
    { key: 'familySupportLoanRepayment', text: 'Bạn sẽ trả nợ theo hình thức nào?', type: 'options', options: [{ label: 'Trả góp đều hàng tháng', value: 'MONTHLY' }, { label: 'Trả một lần khi đủ tiền', value: 'LUMP_SUM' }], condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'LOAN' },
    { key: 'familySupportLoanTerm', text: 'Thời hạn của khoản vay này là bao lâu (năm)', type: 'number', unit: 'năm', condition: (ans: any) => ans.hasFamilySupport === true && ans.familySupportType === 'LOAN' && ans.familySupportLoanRepayment === 'MONTHLY' },
  ], []);

  const visibleQuestionsPart1 = useMemo(() => {
    const combinedData = { ...defaultValues, ...formData };
    return familySupportQuestionsPart1.filter((q) => !q.condition || q.condition(combinedData));
  }, [familySupportQuestionsPart1, formData, defaultValues]);

  const visibleQuestionsPart2 = useMemo(() => {
    const combinedData = { ...defaultValues, ...formData };
    return familySupportQuestionsPart2.filter((q) => !q.condition || q.condition(combinedData));
  }, [familySupportQuestionsPart2, formData, defaultValues]);

  const totalSteps = useMemo(() => {
    return visibleQuestionsPart1.length + 1 + visibleQuestionsPart2.length;
  }, [visibleQuestionsPart1, visibleQuestionsPart2]);

  const handleStep1Change = useCallback((current: number) => {
    setProgress({ current: current + 1, total: totalSteps });
  }, [totalSteps]);

  const handleStep2Change = useCallback((current: number) => {
    const baseProgress = visibleQuestionsPart1.length + 1;
    setProgress({ current: baseProgress + current + 1, total: totalSteps });
  }, [totalSteps, visibleQuestionsPart1.length]);

  const handleForm2DataChange = useCallback(({ formData: newData }: { formData: Partial<OnboardingPlanState> }) => {
    setFormData(prev => ({ ...prev, ...newData }));
  }, []);

  const handleSubmitPart1 = (data: Partial<OnboardingPlanState>) => {
    const newFormData = { ...formData, ...data };
    setFormData(newFormData);
    setStep("analysis");
    setProgress({ current: visibleQuestionsPart1.length + 1, total: totalSteps });
  };

  const handleContinueFromAnalysis = () => {
    setStep("form2");
  };

  const handleSubmit = async (data: Partial<OnboardingPlanState>) => {
    const finalData = { ...formData, ...data };

    if (isEditMode) {
      onSubmit(data);
      return;
    }

    // setStep("loading");

    const familySupportPayload = {
      coApplicantMonthlyIncome: (finalData.coApplicantMonthlyIncome || 0),
      monthlyOtherIncome: (finalData.monthlyOtherIncome || 0),
      hasFamilySupport: (finalData.hasFamilySupport || false),
      familySupportType: finalData.familySupportType,
      familyGiftTiming: finalData.familySupportGiftTiming,
      familySupportAmount: (finalData.familySupportLoanAmount || finalData.familySupportGiftAmount),
      familyLoanInterestRate: finalData.familySupportLoanInterest,
      familyLoanRepaymentType: finalData.familySupportLoanRepayment,
      familyLoanTermYears: finalData.familySupportLoanTerm,
    };

    const result = await updateAndRecalculateFamilySupport(planId, familySupportPayload);

    if (result.success) {
      // setResult(result as RecalculationResult);
      // setStep("result");
      router.push(`/plan/${planId}/spending`);
    } else {
      toast.error(result.error || "Có lỗi xảy ra, vui lòng thử lại.");
      setStep("form1");
    }
  };

  const handleContinue = () => {
    updateOnboardingSectionProgress(planId, "familySupport", OnboardingSectionState.COMPLETED);
    router.push(`/plan/${planId}/spending`);
  };

  // --- Thêm các định nghĩa animation ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.7, // Delay 0.2s giữa mỗi phần tử con
      },
    },
  };

  const itemVariants = {
    hidden: { y: -20, opacity: 0 }, // Bắt đầu từ vị trí y = -20 và ẩn
    visible: {
      y: 0,
      opacity: 1, // Di chuyển đến y = 0 và hiện ra
      transition: {
        duration: 0.5,
        staggerChildren: 0.7,
      },
    },
  };
  // --- Kết thúc phần thêm ---


  if (step === "intro") {
    return (
      <>
        <div
          className="max-w-5xl mx-auto fixed inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: "url('/onboarding/section2bg.png')" }}
        />
        <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col px-6 pt-30 z-10">
          <div className="flex-grow flex flex-col items-center text-center">
            <div className="text-white/80 font-semibold text-lg mb-8">
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
            <p className="text-base text-white/90 max-w-sm">
              Thật tuyệt vời nếu bạn có người đồng hành hoặc sự hỗ trợ tài chính. Hãy cùng xem những nguồn lực này có giúp bạn mua nhà sớm hơn không nhé!
            </p>
          </div>
          <div className="fixed bottom-0 left-0 p-4 right-0 w-full max-w-5xl mx-auto z-10">
            <Button
              onClick={() => {
                setForm1InitialIndex(0);
                setStep("form1");
                updateOnboardingSectionProgress(
                  planId,
                  "familySupport",
                  OnboardingSectionState.IN_PROGRESS,
                );
                updateOnboardingSectionProgress(
                  planId,
                  "assumption",
                  OnboardingSectionState.NOT_STARTED,
                );
                updateOnboardingSectionProgress(
                  planId,
                  "spending",
                  OnboardingSectionState.NOT_STARTED,
                );
              }}
              className="w-full bg-white text-slate-900 hover:bg-slate-200 px-4 text-lg font-semibold rounded-sm shadow-lg transition-transform transform active:scale-95"
            >
              Đi tìm nguồn lực hỗ trợ
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (step === "loading" && familySupport) {
    return (
      <div className="max-w-5xl mx-auto fixed inset-0 pt-2 flex flex-col z-10 bg-[#121212]">
        <LoadingStep title="Nguồn lực hỗ trợ" message="Tính toán các dòng tiền hỗ trợ" percentage={100} />
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
    <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-[#121212] text-white">
      {step === "form1" && (
        <MultiStepQuestionForm
          key="familySupport1"
          questions={familySupportQuestionsPart1}
          onSubmit={handleSubmitPart1}
          title="Nguồn lực hỗ trợ"
          subtitle="Tiếp tục"
          defaultValues={{ ...defaultValues, ...formData }}
          onBackFromFirst={() => setStep("intro")}
          onStepChange={handleStep1Change}
          progressCurrent={progress.current}
          progressTotal={totalSteps}
          initialQuestionIndex={form1InitialIndex}
        />
      )}

      {step === "analysis" && (
        <motion.div // Thay thế 'div' bằng 'motion.div'
          className="flex flex-col h-full flex-grow"
          // Thêm các thuộc tính animation
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="relative flex items-center h-10 mb-4">
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setForm1InitialIndex(visibleQuestionsPart1.length - 1);
                  setStep("form1");
                  setProgress({
                    current: visibleQuestionsPart1.length,
                    total: totalSteps,
                  });
                }}
              >
                <ArrowLeftIcon className="h-12 w-12" />
              </Button>
            </div>
          </div>
          <div className="flex-grow flex flex-col items-center text-center pb-17 px-4 overflow-y-auto">
            <motion.p // Thêm motion và variants
              variants={itemVariants}
              className="text-white/80 font-semibold mb-4"
            >
              Bạn có biết?
            </motion.p>
            <motion.h2 // Thêm motion và variants
              variants={itemVariants}
              className="text-2xl font-bold mb-6"
            >
              Hỗ trợ từ người thân không nhất thiết phải là một khoản cho không!
            </motion.h2>
            <motion.div variants={itemVariants}> {/* Bọc Image trong motion.div */}
              <Image
                src="/onboarding/familyanalys.png"
                alt="Analysis"
                width={400}
                height={300}
                className="mb-6"
              />
            </motion.div>
            <motion.p // Thêm motion và variants
              variants={itemVariants}
              className="text-white/90 max-w-5xl"
            >
              Bằng cách định lượng rõ tiềm năng lợi nhuận và rủi ro của cơ hội mua nhà, bạn có thể mời họ 'cùng đầu tư' và chia sẻ lợi nhuận. Đây là một cách huy động vốn rất thông minh.
            </motion.p>
          </div>
          <motion.div // Thêm motion và variants cho cả phần footer
            variants={itemVariants}
            className="fixed bottom-0 left-0 right-0 z-20 bg-[#121212]/80 backdrop-blur-sm"
          >
            <div className="max-w-5xl mx-auto p-4">
              <Button
                onClick={handleContinueFromAnalysis}
                className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-sm shadow-lg transition-transform transform active:scale-95"
              >
                Tiếp tục
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {step === "form2" && (
        <MultiStepQuestionForm
          key="familySupport2"
          questions={familySupportQuestionsPart2}
          onSubmit={handleSubmit}
          title="Nguồn lực hỗ trợ"
          subtitle="Tiếp tục"
          defaultValues={formData}
          onBackFromFirst={() => {
            setStep("analysis");
            setProgress({
              current: visibleQuestionsPart1.length + 1,
              total: totalSteps,
            });
          }}
          onStepChange={handleStep2Change}
          onDataChange={handleForm2DataChange}
          progressCurrent={progress.current}
          progressTotal={totalSteps}
          isFinalForm={true}
        />
      )}
    </div>
  );
}

