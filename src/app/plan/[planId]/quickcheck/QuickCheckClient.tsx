"use client";

import { useState } from "react";
import QuickCheck from "@/components/onboarding/sections/QuickCheck";
import { useRouter } from "next/navigation";

import LoadingStep from "@/components/onboarding/shared/LoadingStep";
import ResultStep, { RecalculationResult } from "@/components/onboarding/shared/ResultStep";
import { OnboardingSectionState, Plan, PlanFamilySupport } from "@prisma/client";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { updateOnboardingSectionProgress } from "@/actions/onboardingActions";

interface QuickCheckClientProps {
  plan: Plan;
}

export default function QuickCheckClient({ plan }: QuickCheckClientProps) {
  const [status, setStatus] = useState<'form' | 'loading' | 'result'>('form');
  const [result, setResult] = useState<RecalculationResult | null>(null);
  const router = useRouter();
  
  const handleContinue = () => {
    // Navigate to the next section of the plan
    updateOnboardingSectionProgress(plan.id, "quickCheck", OnboardingSectionState.COMPLETED);
    router.push(`/plan/${plan.id}/spending`); // Example next step
  }

  if (status === 'loading') {
      return <LoadingStep title="Kiểm tra khả năng mua nhà" message="Đang kiểm tra khả năng mua nhà" percentage={100}/>;
  }

  if (status === 'result' && result) {
      return <ResultStep plan={result.plan} title="Kiểm tra khả năng mua nhà" message={result.message} earliestPurchaseYear={result.earliestPurchaseYear} onContinue={handleContinue} />;
  }

  return (
    <QuickCheck
      quickCheck={plan as unknown as OnboardingPlanState}
      initialData={{}}
      planId={plan.id}
      onCompleted={handleContinue}
    />
  );
}
