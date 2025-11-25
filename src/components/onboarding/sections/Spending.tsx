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
import LoadingStep from "../shared/LoadingStep";
import ResultStep from "../shared/ResultStep";
import { updateSpendingAndRecalculate } from "@/actions/updateSpendingAndRecalculate";
import { RecalculationResult } from "../shared/ResultStep";
import { updateOnboardingSectionProgress } from "@/actions/onboardingActions";
import { OnboardingSectionState } from "@prisma/client";
import { ArrowLeftIcon } from "lucide-react";
import { motion } from "framer-motion"; // Thêm import này


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
  const [formData, setFormData] = useState<Partial<OnboardingPlanState>>(plan);
  const [progress, setProgress] = useState({ current: 0, total: 1 });
  const [form1InitialIndex, setForm1InitialIndex] = useState(0);
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  const defaultValues: Partial<OnboardingPlanState> = {
    monthlyNonHousingDebt: plan.monthlyNonHousingDebt,
    currentAnnualInsurancePremium: plan.currentAnnualInsurancePremium,
    hasNewChild: plan.hasNewChild,
    yearToHaveChild: plan.yearToHaveChild,
    monthlyChildExpenses: plan.hasNewChild ? (plan.monthlyLivingExpenses ?? 0) * 0.25 : 0,
  };

  console.log("defaultValues", defaultValues);

  const spendingQuestionsPart1: Question[] = useMemo(() => [
    { key: 'monthlyNonHousingDebt', text: 'Số tiền bạn đang trả cho các khoản vay hàng tháng khác? (đơn vị: triệu VNĐ)', type: 'number', unit: 'triệu VNĐ' },
    {
      key: 'currentAnnualInsurancePremium',
      text: 'Chi phí bạn đang trả cho bảo hiểm nhân thọ hàng năm là bao nhiêu? (BHXH, BHYT, ...) (đơn vị: triệu VNĐ)',
      type: 'number',
      unit: 'triệu VNĐ',
      description: "* Nếu bạn đã đóng bảo hiểm xã hội ở nơi làm việc, chỉ cần nhập giá trị bảo hiểm nhân thọ ở đây."
    },
  ], []);

  const spendingQuestionsPart2: Question[] = useMemo(() => [
    // @ts-ignore
    {
      key: 'hasNewChild', text: 'Bạn có dự định sinh thêm em bé không?',
      type: 'options', options: [{ label: 'Có', value: true }, { label: 'Không', value: false }],
      condition: (ans: any) => ans.hasCoApplicant === true
    },
    {
      key: "yearToHaveChild",
      text: "Bạn dự định sinh em bé vào năm nào?",
      type: "options",
      options: [
        { label: `Năm nay (${currentYear})`, value: currentYear },
        { label: `1 năm nữa (${currentYear + 1})`, value: currentYear + 1 },
        { label: `2 năm nữa (${currentYear + 2})`, value: currentYear + 2 },
      ],
      condition: (ans: any) => ans.hasNewChild === true,
    },
    {
      key: "monthlyChildExpenses",
      text: "Chi phí phát sinh hàng tháng khi có thêm em bé (đơn vị: triệu VNĐ)",
      description: "* Theo nghiên cứu của Finful, chi phí phát sinh khi có em bé ước tính bằng 25% tổng chi phí của gia đình. Chúng tôi đã tự động tính toán dựa trên chi phí của gia đình bạn. Bạn có thể điều chỉnh nếu có con số phù hợp hơn.",
      type: "number",
      unit: "triệu VNĐ",
      condition: (ans: any) => ans.hasNewChild === true
    }
  ], [currentYear, plan.hasCoApplicant]);

  const visibleQuestionsPart1 = useMemo(() => {
    return spendingQuestionsPart1.filter((q) => !q.condition || q.condition(formData));
  }, [spendingQuestionsPart1, formData]);

  const visibleQuestionsPart2 = useMemo(() => {
    // For part 2, conditions depend on answers from part 1 and part 2 itself
    const combinedData = { ...defaultValues, ...formData };
    return spendingQuestionsPart2.filter((q) => !q.condition || q.condition(combinedData));
  }, [spendingQuestionsPart2, formData, defaultValues]);

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

  console.log("formData", { ...defaultValues, ...formData });

  const handleContinue = () => {
    updateOnboardingSectionProgress(planId, "spending", OnboardingSectionState.COMPLETED);
    updateOnboardingSectionProgress(planId, "assumption", OnboardingSectionState.IN_PROGRESS);
    router.push(`/plan/${planId}/assumption`);
  }

  const handleSubmitPart1 = (data: Partial<OnboardingPlanState>) => {
    const newFormData = { ...formData, ...data };
    setFormData(newFormData);

    // Logic mới: Chỉ hiển thị analysis và form2 nếu có người đồng hành
    if (plan.hasCoApplicant) {
      setStep("analysis");
      setProgress({
        current: visibleQuestionsPart1.length + 1,
        total: totalSteps,
      });
    } else {
      // Nếu không có người đồng hành, gửi luôn
      handleSubmit(newFormData);
    }
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

    setStep("loading");
    const fullData = { ...initialData, ...finalData };

    const spendingPayload = {
      monthlyNonHousingDebt: fullData.monthlyNonHousingDebt,
      currentAnnualInsurancePremium: fullData.currentAnnualInsurancePremium,
      hasNewChild: fullData.hasNewChild,
      yearToHaveChild: fullData.yearToHaveChild,
      monthlyChildExpenses: fullData.monthlyChildExpenses,
    };
    console.log("spendingPayload", spendingPayload);

    const result = await updateSpendingAndRecalculate(plan, spendingPayload);

    if (result.success) {
      setResult(result as RecalculationResult);
      setStep("result");
    } else {
      toast.error(result.error || "Có lỗi xảy ra, vui lòng thử lại.");
      setStep("form1"); // Go back to form on error
    }
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
          style={{ backgroundImage: "url('/onboarding/section3bg.png')" }}
        />
        <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col p-4 z-10">
          <div className="max-w-5xl mx-auto absolute top-4 left-4 z-20">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/plan/${planId}/familysupport`)}>
              <ArrowLeftIcon className="w-6 h-6 text-white" />
            </Button>
          </div>
          <div className="flex-grow flex flex-col items-center pt-30 px-2 text-center">
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
            <p className="text-base text-white/90 max-w-sm">
              Ngồi vững ghế nhé, có thể năm mua nhà sớm nhất của bạn sẽ bị đẩy lùi đi đó!
            </p>
          </div>
          <Button
            onClick={() => {
              setForm1InitialIndex(0);
              setStep("form1");
              updateOnboardingSectionProgress(
                planId,
                "spending",
                OnboardingSectionState.IN_PROGRESS,
              );
              updateOnboardingSectionProgress(
                planId,
                "assumption",
                OnboardingSectionState.NOT_STARTED,
              );
              updateOnboardingSectionProgress(
                planId,
                "familySupport",
                OnboardingSectionState.COMPLETED,
              );
            }}
            className="w-full bg-white text-slate-900 hover:bg-slate-200 text-lg font-semibold rounded-sm shadow-lg transition-transform transform active:scale-95"
          >
            Tôi sẵn sàng rồi
          </Button>
        </div>
      </>
    );
  }

  if (step === "loading" && !isEditMode) {
    return (
      <div className="max-w-5xl mx-auto fixed inset-0 pt-2 flex flex-col z-10 bg-[#121212]">
        <LoadingStep title="Dòng tiền đi ra" message="Tính toán các dòng tiền đi ra" percentage={100} />
      </div>
    )
  }

  if (step === "result" && result && !isEditMode) {
    return <ResultStep
      plan={result.plan}
      title="Dòng tiền đi ra "
      caseNumber={result.caseNumber}
      message={result.message}
      earliestPurchaseYear={result.earliestPurchaseYear}
      onContinue={handleContinue}
      hasWorsened={result.hasWorsened}
      onBack={() => {
        if (plan.hasCoApplicant) {
          setStep("form2");
        } else {
          setStep("form1");
        }
      }}
    />
  }

  return (
    <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-[#121212] text-white">
      {step === "form1" && (
        <MultiStepQuestionForm
          key="spending1"
          questions={spendingQuestionsPart1}
          onSubmit={handleSubmitPart1}
          title="Dòng tiền đi ra"
          subtitle="Tiếp tục"
          defaultValues={{ ...formData, ...defaultValues }}
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
          <div className="flex-grow flex flex-col items-center text-center pb-17 px-4">
            <motion.p // Thêm motion và variants
              variants={itemVariants}
              className="text-white/80 font-semibold mb-4"
            >
              Bạn có biết?
            </motion.p>
            <motion.h2 // Thêm motion và variants
              variants={itemVariants}
              className="text-2xl font-bold mb-6 max-w-sm"
            >
              Một trong những lý do phổ biến nhất khiến việc mua nhà chậm lại là có em bé ngoài dự kiến
            </motion.h2>
            <motion.div variants={itemVariants}> {/* Bọc Image trong motion.div */}
              <Image
                src="/onboarding/analysis.png"
                alt="Analysis"
                width={400}
                height={300}
                className="mb-6"
              />
            </motion.div>
            <motion.p // Thêm motion và variants
              variants={itemVariants}
              className="text-white/90 max-w-md"
            >
              Hãy cân nhắc thật kỹ về thời điểm sinh em bé để đảm bảo bạn vững vàng nhất về tài chính cũng như kế hoạch mua nhà không bị thay đổi đột ngột ngoài dự kiến.
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
          key="spending2"
          questions={spendingQuestionsPart2}
          onSubmit={handleSubmit}
          title="Dòng tiền đi ra"
          subtitle="Thời gian mua nhà có ảnh hưởng không"
          defaultValues={{ ...formData, ...defaultValues }}
          onBackFromFirst={() => {
            setStep("analysis");
            setProgress({ current: visibleQuestionsPart1.length + 1, total: totalSteps });
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
