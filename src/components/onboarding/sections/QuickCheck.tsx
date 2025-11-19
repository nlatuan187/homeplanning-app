"use client";

import { useState, useMemo, useCallback } from "react";
import { OnboardingPlanState } from "../types";
import MultiStepQuestionForm, {
  Question,
} from "../shared/MultiStepQuestionForm";
import LoadingOverlay from "@/components/ui/loading-overlay";
import {
  calculateQuickCheckResult,
  QuickCheckResultPayload,
} from "@/actions/createPlanFromOnboarding";
import { toast } from "react-hot-toast";
import QuickCheckIntro from "./quick-check/QuickCheckIntro";
import QuickCheckAnalysis, { getAnalysisContent } from "./quick-check/QuickCheckAnalysis";
import QuickCheckResult from "./quick-check/QuickCheckResult";

const currentYear = new Date().getFullYear();

// Define the 7 questions for the Quick Check section
const quickCheckQuestionsPart1: Question[] = [
  {
    key: "yearsToPurchase",
    text: "Thời gian bạn dự định mua căn nhà mơ ước?",
    type: "options",
    options: [
      { label: `Bây giờ (${currentYear})`, value: currentYear },
      { label: `1 năm nữa (${currentYear + 1})`, value: currentYear + 1 },
      { label: `2 năm nữa (${currentYear + 2})`, value: currentYear + 2 },
      { label: `3 năm nữa (${currentYear + 3})`, value: currentYear + 3 },
    ],
  },
  {
    key: "targetHousePriceN0",
    text: "Ngôi nhà mơ ước của bạn hiện tại đang có giá bao nhiêu? (đơn vị: tỷ VNĐ)",
    type: "number",
    unit: "tỷ VNĐ",
  },
  {
    key: "targetHouseType",
    text: "Căn nhà đó là loại nhà gì?",
    type: "options",
    options: [
      { label: "Chung cư", value: "Chung cư" },
      { label: "Nhà mặt đất", value: "Nhà mặt đất" },
      { label: "Khác", value: "Khác" },
    ],
  },
  {
    key: "targetLocation",
    text: "Bạn dự định sẽ mua nhà ở tỉnh/thành phố nào?",
    type: "options",
    options: [
      { label: "Hà Nội", value: "Hà Nội" },
      { label: "TP. Hồ Chí Minh", value: "TP. Hồ Chí Minh" },
      { label: "Tỉnh/Thành phố khác", value: "Tỉnh/Thành phố khác" },
    ],
  },
];

const quickCheckQuestionsPart2: Question[] = [
  {
    key: "hasCoApplicant",
    text: "Bạn có người đồng hành tài chính (vợ/chồng/anh chị em) khi mua nhà không?",
    type: "options",
    options: [
      { label: "Có", value: true },
      { label: "Không", value: false },
    ],
  },
  {
    key: "initialSavings",
    text: (ans) =>
      ans.hasCoApplicant
        ? "Các bạn đã tích lũy được bao nhiêu tiền để mua nhà rồi? (đơn vị: triệu VNĐ)"
        : "Bạn đã tích lũy được bao nhiêu tiền để mua nhà rồi? (đơn vị: triệu VNĐ)",
    type: "number",
    unit: "triệu VNĐ",
  },
  {
    key: "userMonthlyIncome",
    text: (ans) =>
      ans.hasCoApplicant
        ? "TỔNG thu nhập hàng tháng của các bạn là bao nhiêu? (đơn vị: triệu VNĐ)"
        : "Lương hàng tháng của bạn là bao nhiêu? (đơn vị: triệu VNĐ)",
    type: "number",
    unit: "triệu VNĐ",
  },
  {
    key: "monthlyLivingExpenses",
    text: (ans) =>
      ans.hasCoApplicant
        ? "TỔNG chi phí hàng tháng của các bạn là bao nhiêu? (đơn vị: triệu VNĐ)"
        : "Chi phí hàng tháng của bạn là bao nhiêu? (đơn vị: triệu VNĐ)",
    type: "number",
    unit: "triệu VNĐ",
  },
];

interface QuickCheckProps {
  quickCheck?: OnboardingPlanState;
  initialData?: OnboardingPlanState;
  planId?: string;
  onCompleted: (data: {
    onboardingData: Partial<OnboardingPlanState>;
    quickCheckResult: QuickCheckResultPayload;
  }) => void;
  isEditMode?: boolean;
}

export default function QuickCheck({ onCompleted, initialData = {}, isEditMode = false }: QuickCheckProps) {
  const [step, setStep] = useState<"intro" | "form1" | "analysis" | "form2" | "loading" | "result">(
    "intro",
  );
  const [result, setResult] = useState<QuickCheckResultPayload | null>(null);

  const processedInitialData = useMemo(() => {
    if (initialData.targetHousePriceN0) {
      return {
        ...initialData,
        targetHousePriceN0: initialData.targetHousePriceN0 / 1000,
      };
    }
    return initialData;
  }, [initialData]);

  const [formData, setFormData] =
    useState<Partial<OnboardingPlanState>>(processedInitialData);
  const [progress, setProgress] = useState({ current: 0, total: 1 });
  const [form1InitialIndex, setForm1InitialIndex] = useState(0);

  const defaultValues = useMemo(() => processedInitialData, [processedInitialData]);

  const questions1 = useMemo(() => quickCheckQuestionsPart1, []);
  const questions2 = useMemo(() => quickCheckQuestionsPart2, []);

  const visibleQuestionsPart1 = useMemo(() => {
    return questions1.filter((q) => !q.condition || q.condition(formData));
  }, [questions1, formData]);

  const visibleQuestionsPart2 = useMemo(() => {
    const combinedData = { ...defaultValues, ...formData };
    return questions2.filter((q) => !q.condition || q.condition(combinedData));
  }, [questions2, formData, defaultValues]);

  const totalSteps = useMemo(() => {
    const hasAnalysisStep = getAnalysisContent(
      formData.targetLocation,
      formData.targetHouseType,
    );
    return visibleQuestionsPart1.length + (hasAnalysisStep ? 1 : 0) + visibleQuestionsPart2.length;
  }, [visibleQuestionsPart1, visibleQuestionsPart2, formData.targetLocation, formData.targetHouseType]);

  const handleStep1Change = useCallback((current: number) => {
    setProgress({ current: current + 1, total: totalSteps });
  }, [totalSteps]);

  const handleStep2Change = useCallback((current: number) => {
    const hasAnalysisStep = getAnalysisContent(
      formData.targetLocation,
      formData.targetHouseType,
    );
    const baseProgress = visibleQuestionsPart1.length + (hasAnalysisStep ? 1 : 0);
    setProgress({ current: baseProgress + current + 1, total: totalSteps });
  }, [
    totalSteps,
    visibleQuestionsPart1.length,
    formData.targetLocation,
    formData.targetHouseType,
  ]);

  const handleStart = () => {
    setForm1InitialIndex(0);
    setStep("form1");
  };

  const handleSubmitPart1 = (data: Partial<OnboardingPlanState>) => {
    const newFormData = { ...formData, ...data };
    setFormData(newFormData);
    const content = getAnalysisContent(
      data.targetLocation as string,
      data.targetHouseType as string,
    );

    if (content) {
      setStep("analysis");
      setProgress({ current: visibleQuestionsPart1.length + 1, total: totalSteps });
    } else {
      setStep("form2");
      setProgress({ current: visibleQuestionsPart1.length + 1, total: totalSteps });
    }
  };

  const handleContinueFromAnalysis = useCallback(() => {
    setStep("form2");
  }, []);

  const handleAnalysisBack = useCallback(() => {
    setForm1InitialIndex(visibleQuestionsPart1.length - 1);
    setStep("form1");
    setProgress({
      current: visibleQuestionsPart1.length,
      total: totalSteps,
    });
  }, [visibleQuestionsPart1.length, totalSteps]);

  const handleSubmitPart2 = async (data: Partial<OnboardingPlanState>) => {
    const finalData = { ...formData, ...data };

    if (isEditMode) {
      onCompleted({
        onboardingData: finalData,
        quickCheckResult: result as QuickCheckResultPayload,
      });
      return;
    }

    setStep("loading");

    const processedData: Partial<OnboardingPlanState> = {
      ...finalData,
      hasCoApplicant: (finalData.hasCoApplicant || false),
      targetHousePriceN0: (finalData.targetHousePriceN0 || 0),
      initialSavings: (finalData.initialSavings || 0),
      userMonthlyIncome: (finalData.userMonthlyIncome || 0),
      monthlyLivingExpenses: (finalData.monthlyLivingExpenses || 0),
      yearsToPurchase: (finalData.yearsToPurchase || 0),
    };

    try {
      const response = await calculateQuickCheckResult(processedData);
      if (response.success && response) {
        setResult(response);
        setFormData(processedData); // Save the completed data
        setStep("result");
      } else {
        toast.error(response.error || "Không thể tính toán. Vui lòng thử lại.");
        setStep("form2"); // Go back to the form
      }
    } catch (error) {
      console.error("Quick check calculation failed", error);
      toast.error("Đã xảy ra lỗi kết nối. Vui lòng thử lại.");
      setStep("form2");
    }
  };

  const handleContinueFromResult = () => {
    if (!result) return;
    onCompleted({
      onboardingData: formData,
      quickCheckResult: result,
    });
  };

  if (step === "intro") {
    return <QuickCheckIntro onStart={handleStart} />;
  }

  if (step === "loading" && !isEditMode) {
    return (
      <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-[#121212] text-white">
        <LoadingOverlay messages={["Đang kiểm tra khả năng mua nhà..."]} />
      </div>
    );
  }

  if (step === "result" && result && !isEditMode) {
    return (
      <QuickCheckResult
        result={result}
        formData={formData}
        onNext={handleContinueFromResult}
        onBack={() => setStep("form2")}
      />
    );
  }

  if (step === "analysis") {
    return (
      <QuickCheckAnalysis
        formData={formData}
        onBack={handleAnalysisBack}
        onNext={handleContinueFromAnalysis}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-[#121212] text-white">
      {step === "form1" && (
        <MultiStepQuestionForm
          key="quickCheck1"
          questions={questions1}
          onSubmit={handleSubmitPart1}
          title="Đánh giá nhanh"
          subtitle="Tiếp tục"
          defaultValues={{ ...defaultValues, ...formData }}
          onBackFromFirst={() => setStep("intro")}
          onStepChange={handleStep1Change}
          progressCurrent={progress.current}
          progressTotal={totalSteps}
          initialQuestionIndex={form1InitialIndex}
          autoSubmitOnLastOption={true}
        />
      )}

      {step === "form2" && (
        <MultiStepQuestionForm
          key="quickCheck2"
          questions={questions2}
          onSubmit={handleSubmitPart2}
          title="Đánh giá nhanh"
          subtitle="Xem kết quả"
          defaultValues={{ ...defaultValues, ...formData }}
          onBackFromFirst={() => {
            const content = getAnalysisContent(
              formData.targetLocation as string,
              formData.targetHouseType as string,
            );
            if (content) {
              setStep("analysis");
              setProgress({
                current: visibleQuestionsPart1.length + 1,
                total: totalSteps,
              });
            } else {
              setForm1InitialIndex(visibleQuestionsPart1.length - 1);
              setStep("form1");
              setProgress({
                current: visibleQuestionsPart1.length,
                total: totalSteps,
              });
            }
          }}
          onStepChange={handleStep2Change}
          progressCurrent={progress.current}
          progressTotal={totalSteps}
          isFinalForm={true}
        />
      )}
    </div>
  );
}