"use client";

import { useState } from "react";
import Spending from "@/components/onboarding/sections/Spending";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { updateSpendingAndRecalculate } from "@/actions/updateSpendingAndRecalculate";
import LoadingStep from "@/components/onboarding/shared/LoadingStep";
import ResultStep, { RecalculationResult } from "@/components/onboarding/shared/ResultStep";
import { Plan } from "@prisma/client";

interface SpendingClienttProps {
  plan: Plan;
}

export default function SpendingClient({ plan }: SpendingClienttProps) {
  const [status, setStatus] = useState<'form' | 'loading' | 'result'>('form');
  const [result, setResult] = useState<RecalculationResult | null>(null);
  const router = useRouter();

  const handleFormSubmit = async (data: Partial<OnboardingPlanState>) => {
    setStatus('loading');
    
    // Simulate calculation time
    setTimeout(async () => {
        const response = await updateSpendingAndRecalculate(plan.id, data);
        if (response.success) {
            setResult(response as RecalculationResult);
            setStatus('result');
        } else {
            toast.error(response.error || "Có lỗi xảy ra.");
            setStatus('form'); // Go back to form on error
        }
    }, 2500); // 2.5 second delay as per PRD
  };
  
  const handleContinue = () => {
      // Navigate to the next section of the plan
      router.push(`/plan/${plan.id}/spending`); // Example next step
  }

  if (status === 'loading') {
      return <LoadingStep title="Nguồn lực hỗ trợ" />;
  }

  if (status === 'result' && result) {
      return <ResultStep plan={result.plan} title="Nguồn lực hỗ trợ" message={result.message} earliestPurchaseYear={result.earliestPurchaseYear} onContinue={handleContinue} />;
  }

  return (
    <Spending
      initialData={{}}
      plan={plan}
      onCompleted={handleFormSubmit}
    />
  );
}
