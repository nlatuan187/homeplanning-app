"use client";

import { useMemo, useState } from "react";
import { Plan } from "@prisma/client";
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

interface AssumptionData {
  pctSalaryGrowth: number;
  pctHouseGrowth: number;
  pctInvestmentReturn: number;
}

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

  if (!plan) {
    return <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col z-10 bg-slate-950"><LoadingStep title="Đang tải dữ liệu..." /></div>;
  }

  // State for controlling the UI steps (intro, form, loading, result)
  const [step, setStep] = useState<"intro" | "form" | "loading" | "result">("intro");
  
  // State for controlling the assumption substep (0, 1, 2)
  const [assumptionStep, setAssumptionStep] = useState(0);
  // State for the sliders values
  const [assumptions, setAssumptions] = useState({
    pctSalaryGrowth: plan.pctSalaryGrowth ?? 7,
    pctHouseGrowth: plan.pctHouseGrowth ?? 10,
    pctInvestmentReturn: plan.pctInvestmentReturn ?? 11,
  });

  const chartData = useMemo(() => {
    const tempPlan = {
      ...plan,
      pctSalaryGrowth: assumptions.pctSalaryGrowth,
      pctHouseGrowth: assumptions.pctHouseGrowth,
      pctInvestmentReturn: assumptions.pctInvestmentReturn,
    };
    const projections = generateProjections(tempPlan as PlanWithDetails);
    return generateAccumulationMilestones(projections, tempPlan as PlanWithDetails);
  }, [plan, assumptions]);
  
  // State to store the result from the server
  const [result, setResult] = useState<any | null>(null);

  const handleSliderChange = (key: keyof typeof assumptions, value: number) => {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (assumptionStep < 2) {
      setAssumptionStep(prev => prev + 1);
    } else {
      // Last step, so we submit
      handleSubmit(assumptions);
    }
  };

  const handlePrev = () => {
    if (assumptionStep > 0) {
      setAssumptionStep(prev => prev - 1);
    }
  };

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
  
  const handleFinalChoice = (year: number) => {
    toast.success(`Đã chốt kế hoạch mua nhà vào năm ${year}!`);
    router.push(`/plan/${plan.id}/roadmap`);
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
    />
  );
}
