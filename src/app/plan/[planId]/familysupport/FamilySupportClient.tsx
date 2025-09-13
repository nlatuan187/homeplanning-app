"use client";

import { useState } from "react";
import FamilySupport from "@/components/onboarding/sections/FamilySupport";
import { useRouter } from "next/navigation";

import LoadingStep from "@/components/onboarding/shared/LoadingStep";
import ResultStep, { RecalculationResult } from "@/components/onboarding/shared/ResultStep";
import { OnboardingSectionState, Plan, PlanFamilySupport } from "@prisma/client";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { updateOnboardingSectionProgress } from "@/actions/onboardingActions";
// Define the Plan with familySupport relation
type PlanWithFamilySupport = Plan & {
  familySupport: PlanFamilySupport | null;
};

interface FamilySupportClientProps {
  plan: PlanWithFamilySupport;
}

export default function FamilySupportClient({ plan }: FamilySupportClientProps) {
  const [status, setStatus] = useState<'form' | 'loading' | 'result'>('form');
  const [result, setResult] = useState<RecalculationResult | null>(null);
  const router = useRouter();
  
  const handleContinue = () => {
      // Navigate to the next section of the plan
      updateOnboardingSectionProgress(plan.id, "familySupport", OnboardingSectionState.COMPLETED);
      updateOnboardingSectionProgress(plan.id, "spending", OnboardingSectionState.IN_PROGRESS);
      router.push(`/plan/${plan.id}/spending`); // Example next step
  }

  if (status === 'loading') {
      return <LoadingStep title="Nguồn lực hỗ trợ" message="Tính toán các dòng tiền hỗ trợ" percentage={100}/>;
  }

  if (status === 'result' && result) {
      return <ResultStep plan={result.plan} title="Nguồn lực hỗ trợ" message={result.message} earliestPurchaseYear={result.earliestPurchaseYear} onContinue={handleContinue} />;
  }

  return (
    <FamilySupport
      familySupport={plan.familySupport as OnboardingPlanState}
      initialData={{}}
      planId={plan.id}
      onCompleted={handleContinue}
    />
  );
}
