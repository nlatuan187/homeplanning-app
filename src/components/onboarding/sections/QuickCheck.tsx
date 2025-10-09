"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { OnboardingPlanState } from "../types";
import MultiStepQuestionForm, {
  Question,
} from "../shared/MultiStepQuestionForm";
import { ArrowLeftIcon, CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import LoadingOverlay from "@/components/ui/loading-overlay";
import {
  calculateQuickCheckResult,
  QuickCheckResultPayload,
} from "@/actions/createPlanFromOnboarding";
import { toast } from "react-hot-toast";
import { generateProjections, PlanWithDetails, preparePlanForProjection } from "@/lib/calculations/projections/generateProjections";
import { ProjectionRow } from "@/lib/calculations/affordability";
import ResultsClient from "./ResultsClient";

const currentYear = new Date().getFullYear();

// Define the 7 questions for the Quick Check section
const quickCheckQuestionsPart1: Question[] = [
  {
    key: "yearsToPurchase",
    text: "Bạn dự định mua nhà vào thời điểm nào?",
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
    text: "Ngôi nhà mơ ước của bạn hiện tại đang có giá bao nhiêu?",
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
        ? "Các bạn đã tích lũy được bao nhiêu tiền để mua nhà rồi?"
        : "Bạn đã tích lũy được bao nhiêu tiền để mua nhà rồi?",
    type: "number",
    unit: "triệu VNĐ",
  },
  {
    key: "userMonthlyIncome",
    text: (ans) =>
      ans.hasCoApplicant
        ? "TỔNG thu nhập hàng tháng của các bạn là bao nhiêu?"
        : "Lương hàng tháng của bạn là bao nhiêu?",
    type: "number",
    unit: "triệu VNĐ",
  },
  {
    key: "monthlyLivingExpenses",
    text: (ans) =>
      ans.hasCoApplicant
        ? "TỔNG chi phí hàng tháng của các bạn là bao nhiêu?"
        : "Chi phí hàng tháng của bạn là bao nhiêu?",
    type: "number",
    unit: "triệu VNĐ",
  },
];

const analysisContent: any = {
  "Hà Nội": {
    "Chung cư": {
      summary:
        "Lựa chọn của bạn đang tập trung vào sự an toàn và tăng trưởng ổn định.",
      image: "/onboarding/hanoi-chungcu.png", // Placeholder image
      points: {
        "Bức tranh toàn cảnh":
          "Trong 5 năm qua, chung cư Hà Nội đã chứng tỏ là một tài sản tăng trưởng rất bền bỉ, với mức tăng tổng thể từ 70% đến 90%. Điều đáng nói là sự tăng trưởng này diễn ra một cách ổn định, không trải qua những cú sốc giảm giá sâu như các phân khúc khác.",
        "Động lực chính":
          "Sức mạnh của phân khúc này đến từ nhu cầu ở thực. Ngay cả trong giai đoạn thị trường khó khăn nhất (2022-2023), giá chung cư vẫn được neo giữ vững chắc vì người mua để ở không dễ dàng bán cắt lỗ. Khi thị trường phục hồi, sự khan hiếm nguồn cung mới càng đẩy giá trị của các dự án hiện hữu tăng lên.",
        "Ý nghĩa với bạn (người mua nhà)":
          "Việc lựa chọn chung cư mang lại một nền tảng vững chắc cho kế hoạch của bạn. Sự ổn định về giá giúp bạn an tâm tập trung vào việc tích lũy mà không phải quá lo lắng về những biến động ngắn hạn của thị trường. Đây là một lựa chọn ưu tiên sự an toàn và tăng trưởng dài hạn, rất phù hợp với mục tiêu an cư.",
      },
    },
    "Nhà mặt đất": {
      summary:
        "Lựa chọn của bạn đòi hỏi sự kiên nhẫn và am hiểu sâu sắc về chu kỳ.",
      image: "/onboarding/hanoi-nhadat.png", // Placeholder image
      points: {
        "Bức tranh toàn cảnh":
          "Nhà đất là một phân khúc có sự biến động lớn hơn. Nó đã trải qua một giai đoạn tăng trưởng rất nóng (2020-2022), đặc biệt là đất nền ven đô (tăng 100-150%), nhưng sau đó cũng điều chỉnh giảm 30-40% so với đỉnh. Tuy vậy, nếu nhìn cả chặng đường 5 năm, mặt bằng giá hiện tại vẫn cao hơn năm 2020 khoảng 40% đến 60%.",
        "Động lực chính":
          "Sự tăng trưởng của nhà đất trong giai đoạn sốt phụ thuộc nhiều vào dòng tiền đầu cơ và lãi suất thấp. Khi các yếu tố này thay đổi, thị trường sẽ cần thời gian để tìm lại điểm cân bằng dựa trên giá trị sử dụng thực tế.",
        "Ý nghĩa với bạn (người mua nhà)":
          "Lựa chọn nhà đất đòi hỏi một tầm nhìn dài hạn và sự kiên nhẫn. Tiềm năng của nó nằm ở giá trị đất đai lâu dài và sự tự do trong việc xây dựng tổ ấm. Tuy nhiên, bạn cần chuẩn bị tâm lý cho những biến động của chu kỳ và không nên kỳ vọng vào việc tăng giá nhanh chóng trong ngắn hạn. Hãy tập trung vào giá trị sử dụng và khả năng tài chính của mình thay vì chạy theo các cơn sốt.",
      },
    },
  },
  "TP. Hồ Chí Minh": {
    "Chung cư": {
      summary: "Bạn đang lựa chọn một thị trường của giá trị thực và bền vững.",
      image: "/onboarding/hcmc-chungcu.png", // Placeholder image
      points: {
        "Bức tranh toàn cảnh":
          "Tương tự Hà Nội, chung cư TP.HCM là một kênh giữ giá trị tốt với mức tăng trưởng tổng thể 35% đến 50% trong 5 năm, chủ yếu là do sự khan hiếm nguồn cung sơ cấp. Đà tăng có phần chậm hơn so với Hà Nội do mặt bằng giá ban đầu đã ở mức cao.",
        "Động lực chính":
          "Yếu tố quyết định đến giá trị chung cư tại TP.HCM là sự khan hiếm nguồn cung các dự án mới. Khi nguồn cung sơ cấp hạn chế, nhu cầu sẽ dồn về thị trường thứ cấp (mua đi bán lại), từ đó giúp các dự án hiện hữu duy trì và gia tăng giá trị.",
        "Ý nghĩa với bạn (người mua nhà)":
          "Lựa chọn chung cư tại TP.HCM là một quyết định đầu tư vào giá trị thực và sự khan hiếm. Sự ổn định của phân khúc này giúp bạn dễ dàng lập kế hoạch tài chính hơn. Việc giá trị tài sản được bảo chứng bởi các yếu tố nền tảng (nguồn cung, nhu cầu ở thực) sẽ giúp bạn tự tin hơn rằng ngôi nhà của mình là một tài sản bền vững theo thời gian.",
      },
    },
    "Nhà mặt đất": {
      summary: "Đây là một thị trường có sự biến động mạnh.",
      image: "/onboarding/hcmc-nhadat.png", // Placeholder image
      points: {
        "Bức tranh toàn cảnh":
          "Phân khúc nhà đất tại TP.HCM cũng trải qua một chu kỳ biến động mạnh, với mức tăng trưởng tổng thể 5 năm khoảng 30% đến 40%. Một đặc điểm quan trọng là sự liên kết chặt chẽ với các thị trường vệ tinh như Bình Dương, Đồng Nai.",
        "Động lực chính":
          "Các cơn sốt đất nền vùng ven (2020-2022) được thúc đẩy bởi dòng tiền đầu cơ và các thông tin quy hoạch hạ tầng. Khi thị trường trầm lắng (2022-2023), phân khúc này đã điều chỉnh đáng kể và đang trong giai đoạn phục hồi chậm.",
        "Ý nghĩa với bạn (người mua nhà)":
          "Việc mua nhà đất là một cam kết lâu dài với giá trị cốt lõi nằm ở quyền sở hữu đất. Kế hoạch của bạn cần tính đến các yếu tố chu kỳ và không nên quá phụ thuộc vào các đòn bẩy tài chính ngắn hạn. Hãy tập trung vào các khu vực có tiềm năng phát triển hạ tầng thực sự và xác định đây là một tài sản để 'an cư' và tích lũy giá trị trong dài hạn, thay vì kỳ vọng lợi nhuận nhanh chóng.",
      },
    },
  },
};

const getAnalysisContent = (
  city: string | undefined,
  propertyType: string | undefined,
) => {
  if (!city || !propertyType) return null;
  return analysisContent[city]?.[propertyType] || null;
};

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

  const router = useRouter();

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

  const handleContinueFromAnalysis = () => {
    setStep("form2");
  };

  const handleSubmitPart2 = async (data: Partial<OnboardingPlanState>) => {
    setStep("loading");
    const finalData = { ...formData, ...data };
    const processedData: Partial<OnboardingPlanState> = {
      ...finalData,
        hasCoApplicant: (finalData.hasCoApplicant || false),
        targetHousePriceN0: (finalData.targetHousePriceN0 || 0),
        initialSavings: (finalData.initialSavings || 0),
        userMonthlyIncome: (finalData.userMonthlyIncome || 0),
        monthlyLivingExpenses: (finalData.monthlyLivingExpenses || 0),
        yearsToPurchase: (finalData.yearsToPurchase || 0),
    };
    console.log("processedData", processedData);
    console.log("response", await calculateQuickCheckResult(processedData));

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
    return (
      <>
        <div
          className="max-w-5xl mx-auto fixed inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: "url('/onboarding/section1bg.png')" }}
        />
        <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col p-4 text-white z-10">
          <div className="flex flex-col items-center text-center pt-7">
            <h1 className="text-3xl font-bold mb-2">
              Chào mừng bạn đến với Finful
            </h1>
            <p className="text-lg text-white/90 mb-8 italic">
              Người đồng hành cùng bạn mua nhà
            </p>
            <Image
              src="/icons/suitcase 0.png"
              alt="Kiểm tra khả năng mua nhà"
              width={150}
              height={150}
              className="mb-6"
            />
            <div className="space-y-4 w-full text-left">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-2 flex items-center">
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">
                      Chúng tôi có thể
                    </h3>
                    <CheckCircle className="max-md:w-4 max-md:h-4 w-6 h-6 flex-shrink-0" />
                  </div>
                  <p className="text-lg max-md:text-xs text-white/80">
                    Tính toán và chỉ ra tất cả các con đường giúp bạn mua được
                    nhà, từ tiết kiệm đến đầu tư, vay vốn.
                  </p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-2 flex items-center">
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">
                      Chúng tôi không thể
                    </h3>
                    <XCircle className="max-md:w-4 max-md:h-4 w-6 h-6 flex-shrink-0" />
                  </div>
                  <p className="text-lg max-md:text-xs text-white/80">
                    Quyết định thay bạn. Chúng tôi chỉ nhận nhu cầu, tình hình
                    và để bạn tự chọn con đường phù hợp.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="fixed bottom-0 left-0 right-0 z-20">
            <div className="max-w-5xl mx-auto p-4">
              <div className="space-y-3">
                {!isEditMode ? (
                  <>
                    <Button
                      onClick={handleStart}
                      className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-lg transition-transform transform active:scale-95"
                    >
                      Bắt đầu ngay
                    </Button>
                    <Button
                      onClick={() => router.push("/sign-in")}
                      className="w-full bg-transparent border border-white/50 cursor-pointer text-white hover:bg-white/10 py-4 text-lg font-semibold rounded-lg shadow-lg transition-transform transform active:scale-95"
                    >
                      Đăng nhập (Nếu đã có tài khoản)
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleStart}
                    className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-lg transition-transform transform active:scale-95"
                  >
                    Bắt đầu ngay
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (step === "loading") {
    return (
      <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-slate-950 text-white">
        <LoadingOverlay messages={["Đang kiểm tra khả năng mua nhà..."]} />
      </div>
    );
  }

  if (step === "result" && result) {
    const yearsToPurchase = (formData.yearsToPurchase ?? new Date().getFullYear()) - new Date().getFullYear();

    const partialPlan: Partial<PlanWithDetails> = {
      yearsToPurchase: yearsToPurchase,
      hasCoApplicant: formData.hasCoApplicant ?? false,
      targetHousePriceN0: (formData.targetHousePriceN0 ?? 0) * 1000,
      initialSavings: formData.initialSavings ?? 0,
      userMonthlyIncome: formData.userMonthlyIncome ?? 0,
      monthlyLivingExpenses: formData.monthlyLivingExpenses ?? 0,
      confirmedPurchaseYear: formData.yearsToPurchase ?? 0,
      pctSalaryGrowth: 7.0,
      pctHouseGrowth: 10.0,
      pctInvestmentReturn: 11.0,
      pctExpenseGrowth: 4.0,
      loanInterestRate: 11.0,
      loanTermYears: 25,
      monthlyNonHousingDebt: 0,
      currentAnnualInsurancePremium: 0,
      hasNewChild: false,
      yearToHaveChild: 0,
      monthlyChildExpenses: 0,
      paymentMethod: "fixed",
      coApplicantSalaryGrowth: 7.0,
    };

    // Chạy hàm tính toán projection với đối tượng plan tạm thời
    const projectionData = generateProjections(partialPlan);
    console.log("projectionData", projectionData);
    const targetYearProjection: ProjectionRow | undefined =
      projectionData.find(p => p.isAffordable);

    console.log("targetYearProjection", targetYearProjection);
    const displayPlan = { ...partialPlan };

    return (
      <ResultsClient plan={displayPlan as any} firstYearProjection={targetYearProjection} onCompleted={handleContinueFromResult} />
    );
  }

  return (
    <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-slate-950 text-white">
      {step === "form1" && (
        <MultiStepQuestionForm
          key="form1"
          questions={questions1}
          onSubmit={handleSubmitPart1}
          title="Kiểm tra"
          subtitle="Tôi có mua được nhà không?"
          defaultValues={formData}
          onBackFromFirst={() => setStep("intro")}
          onStepChange={handleStep1Change}
          progressCurrent={progress.current}
          progressTotal={totalSteps}
          initialQuestionIndex={form1InitialIndex}
          autoSubmitOnLastOption={true}
        />
      )}

      {step === "analysis" && (
        (() => {
          const { targetLocation, targetHouseType } = formData;
          const content = getAnalysisContent(
            targetLocation as string,
            targetHouseType as string,
          );
          if (!content) return null;

          return (
            <div className="flex flex-col h-full flex-grow">
              <div>
                <div className="relative flex items-center h-10 mb-4 mx-2">
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
                      disabled={progress.current === 0}
                    >
                      <ArrowLeftIcon className="h-12 w-12" />
                    </Button>
                  </div>

                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold text-white text-lg">
                    Kiểm tra
                  </div>
                </div>
              </div>
              <div className="relative flex-grow flex flex-col items-center text-center px-4 overflow-y-auto pb-17">
                <p className="text-lg mb-2">
                  Bạn muốn mua {targetHouseType} tại {targetLocation}
                </p>
                <p className="text-xl font-bold text-cyan-400 mb-6 max-w-5xl">
                  {content.summary}
                </p>
                <Image
                  src={content.image}
                  alt={`${targetHouseType} tại ${targetLocation}`}
                  width={400}
                  height={400}
                  className="mb-6"
                />
                <div className="space-y-4 w-full max-w-5xl text-left text-sm">
                  {Object.entries(content.points).map(([key, value]) => (
                    <div key={key}>
                      <h3 className="font-semibold text-cyan-400 mb-1">{key}</h3>
                      <p className="text-white/80">{value as string}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="fixed bottom-0 left-0 right-0 z-20 bg-slate-950/80 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto p-4">
                  <Button
                    onClick={handleContinueFromAnalysis}
                    className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-lg transition-transform transform active:scale-95"
                  >
                    Tiếp tục
                  </Button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {step === "form2" && (
        <MultiStepQuestionForm
          key="form2"
          questions={questions2}
          onSubmit={handleSubmitPart2}
          title="Kiểm tra"
          subtitle="Tôi có mua được nhà không?"
          defaultValues={formData}
          onBackFromFirst={() => {
            const hasAnalysisStep = getAnalysisContent(
              formData.targetLocation,
              formData.targetHouseType,
            );
            if (hasAnalysisStep) {
              setStep("analysis");
              setProgress({
                current: visibleQuestionsPart1.length + 1,
                total: totalSteps,
              });
            } else {
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