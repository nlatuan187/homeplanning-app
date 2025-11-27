"use client";

import { useMemo, useState, useEffect } from "react";
import { OnboardingSectionState, Plan } from "@prisma/client";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Assumption from "@/components/onboarding/sections/Assumption";
import LoadingStep from "@/components/onboarding/shared/LoadingStep";
import { generateProjections, PlanWithDetails } from "@/lib/calculations/projections/generateProjections";
import { generateAccumulationMilestones } from "@/lib/calculations/projections/generateChartData";
import { RecalculationResult } from "@/components/onboarding/shared/ResultStep";
import { updateAndRecalculateAssumption } from "@/actions/updateAndRecalculateAssumption";
import { cachePlaygroundProjections, upsertInteractionLogEntry } from "@/actions/updatePlayground";
import { confirmPlaygroundAssumptions } from "@/actions/confirmPlaygroundAssumptions";
import { confirmPurchaseYear } from "@/actions/confirmPurchaseYear";
import { updateOnboardingSectionProgress } from "@/actions/onboardingActions";

interface AssumptionData {
  pctSalaryGrowth: number;
  pctHouseGrowth: number; 
  pctInvestmentReturn: number;
}

type DataKey = 'pctSalaryGrowth' | 'pctHouseGrowth' | 'pctInvestmentReturn';

interface AssumptionClientProps {
  plan: Plan;
}

type InteractionLogEntry = {
  timestamp: string;
  type: "interaction_start" | "initial_change" | "reset_to_initial" | "final_submit";
  values?: Record<string, any>;
};

export default function AssumptionClient({ plan }: AssumptionClientProps) {
  const router = useRouter();
  const [dataKey, setDataKey] = useState<DataKey>('pctSalaryGrowth');

  if (!plan) {
    return <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col z-10 bg-[#121212]">
      <LoadingStep title="Đang tải dữ liệu" message="Đang tải dữ liệu..." percentage={100} />
    </div>;
  }

  // State for controlling the UI steps (intro, form, loading, result)
  const [step, setStep] = useState<"intro" | "form" | "loading" | "result" | "accept" | "schedule">("intro");
  const [loadingTitle, setLoadingTitle] = useState("Hoàn thiện kế hoạch");
  
  // State for controlling the assumption substep (0, 1, 2)
  const [assumptionStep, setAssumptionStep] = useState(0);
  // State for the sliders values
  const [assumptions, setAssumptions] = useState({
    pctSalaryGrowth: plan.pctSalaryGrowth ?? 7,
    pctHouseGrowth: plan.pctHouseGrowth ?? 10,
    pctInvestmentReturn: plan.pctInvestmentReturn ?? 11,
  });
  // State mới để theo dõi các trường đã tương tác
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  
  // State to store the result from the server
  const [result, setResult] = useState<any | null>(null);

  const handleSliderChange = (key: keyof typeof assumptions, value: number) => {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
    // Đánh dấu trường đã tương tác
    if (!touchedFields[key]) {
      setTouchedFields((prev) => ({ ...prev, [key]: true }));
    }
  };

  const handleNext = () => {
    if (assumptionStep < 3) {
      setAssumptionStep(prev => prev + 1);
      setDataKey(prev => prev === 'pctSalaryGrowth' ? 'pctHouseGrowth' : 'pctInvestmentReturn');
    } else {
      // Last step, so we submit
      handleSubmit(assumptions);
    }
  };

  const handlePrev = () => {
    // Nếu chúng ta không ở slider đầu tiên, chỉ cần quay lại slider trước đó.
    if (assumptionStep > 0) {
      setAssumptionStep(prev => prev - 1);
      setDataKey(prev => prev === 'pctHouseGrowth' ? 'pctSalaryGrowth' : 'pctHouseGrowth');
    } else {
      // Nếu đang ở slider đầu tiên, điều hướng về section Spending.
      setStep("intro");
    }
  };

  console.log("assumptions", assumptions);

  const chartData = useMemo(() => {
    const tempPlan = {
      ...plan,
      pctSalaryGrowth: assumptions.pctSalaryGrowth,
      pctHouseGrowth: assumptions.pctHouseGrowth,
      pctInvestmentReturn: assumptions.pctInvestmentReturn,
    };
    return generateAccumulationMilestones(tempPlan as PlanWithDetails, dataKey);
  }, [plan, assumptions, dataKey]);

  const handleSubmit = async (formData: AssumptionData) => {
    setStep("loading");
    const fullData = { ...plan, ...formData };

    const assumptionPayload = {
      pctSalaryGrowth: fullData.pctSalaryGrowth,
      pctHouseGrowth: fullData.pctHouseGrowth,
      pctInvestmentReturn: fullData.pctInvestmentReturn,
    };

    const result = await updateAndRecalculateAssumption(plan.id, assumptionPayload);

    if (result.success) {
      setResult(result as RecalculationResult);
      setStep("result");
    } else {
      toast.error(result.error || "Có lỗi xảy ra, vui lòng thử lại.");
      setStep("form"); // Go back to form on error
    }
  };
  
  const handleFinalChoice = async (year: number) => {
    updateOnboardingSectionProgress(plan.id, "assumption", OnboardingSectionState.COMPLETED);
    setLoadingTitle("Đang tạo lộ trình...");
    setStep("loading");
    
    try {
      const result = await confirmPurchaseYear(plan.id, year);
      if (result.success) {
        toast.success(`Đã chốt kế hoạch mua nhà vào năm ${year}!`);
        router.push(`/plan/${plan.id}/roadmap`);
      } else {
        toast.error(result.error || "Có lỗi xảy ra khi lưu năm mua nhà");
        setStep("result");
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra, vui lòng thử lại");
      setStep("result");
    }
  };

  const projections = generateProjections(plan as PlanWithDetails);

  const confirmedProjection = projections.find(p => p.year === plan.confirmedPurchaseYear);

  const handleConfirm = async () => {

    // Bước 1: Tạo và lưu ngay lập tức entry log cuối cùng.
    // Chúng ta không dùng `recordInteraction` vì không muốn debounce hành động này.
    const finalLogEntry: InteractionLogEntry = {
      timestamp: new Date().toISOString(),
      type: "final_submit", // Sử dụng một type riêng biệt
      // Có thể thêm các giá trị cuối cùng vào đây nếu muốn
      values: {
        pctSalaryGrowth: assumptions.pctSalaryGrowth,
        pctInvestmentReturn: assumptions.pctInvestmentReturn,
        pctHouseGrowth: assumptions.pctHouseGrowth,
      },
    };
    await upsertInteractionLogEntry(plan.id, finalLogEntry);

    // Bước 2: Gọi action để chốt các giả định (không cần gửi log nữa)
    await confirmPlaygroundAssumptions(
      plan.id,
      {
        pctSalaryGrowth: assumptions.pctSalaryGrowth,
        pctInvestmentReturn: assumptions.pctInvestmentReturn,
        pctHouseGrowth: assumptions.pctHouseGrowth,
      }
    );

    await cachePlaygroundProjections(plan.id, generateProjections(plan as PlanWithDetails));

    // Bước 3: Điều hướng người dùng
    const yearsToPurchase = confirmedProjection?.n ?? plan.yearsToPurchase;
    if (yearsToPurchase <= 3) {
      router.push(`/plan/${plan.id}/roadmap`);
    } else {
      router.push(`/plan/${plan.id}/report`);
    }
  };


  return (
    <Assumption
      plan={plan}
      step={step}
      setStep={setStep}
      assumptionStep={assumptionStep}
      onNext={handleNext}
      onPrev={handlePrev}
      onConfirm={handleConfirm}
      result={result}
      assumptions={assumptions}
      onSliderChange={handleSliderChange}
      onFinalChoice={handleFinalChoice}
      chartData={chartData}
      loadingTitle={loadingTitle}
    />
  );
}
