"use client";

import { useState } from "react";
import FamilySupport from "@/components/onboarding/sections/FamilySupport";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { updateAndRecalculateFamilySupport } from "@/actions/updateAndRecalculateFamilySupport";
import LoadingStep from "@/components/onboarding/shared/LoadingStep";
import ResultStep, { RecalculationResult } from "@/components/onboarding/shared/ResultStep";

interface FamilySupportClientProps {
  planId: string;
}

export default function FamilySupportClient({ planId }: FamilySupportClientProps) {
  const [status, setStatus] = useState<'form' | 'loading' | 'result'>('form');
  const [result, setResult] = useState<RecalculationResult | null>(null);
  const router = useRouter();

  const handleFormSubmit = async (data: Partial<OnboardingPlanState>) => {
    setStatus('loading');
    
    // Simulate calculation time
    setTimeout(async () => {
        const response = await updateAndRecalculateFamilySupport(planId, data);
        if (response.success) {
            setResult(response);
            setStatus('result');
        } else {
            toast.error(response.error || "Có lỗi xảy ra.");
            setStatus('form'); // Go back to form on error
        }
    }, 2500); // 2.5 second delay as per PRD
  };
  
  const handleContinue = () => {
      // Navigate to the next section of the plan
      router.push(`/plan/${planId}/spending`); // Example next step
  }

  if (status === 'loading') {
      return <LoadingStep title="Nguồn lực hỗ trợ" onLoadingComplete={() => {}} />;
  }

  if (status === 'result' && result) {
      return <ResultStep title="Nguồn lực hỗ trợ" result={result} onContinue={handleContinue} />;
  }

  return (
    <FamilySupport
      initialData={{}}
      planId={planId}
      onCompleted={handleFormSubmit}
    />
  );
}
