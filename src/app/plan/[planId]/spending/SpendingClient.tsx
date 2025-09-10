"use client";

import { useState } from "react";
import Spending from "@/components/onboarding/sections/Spending";
import { useRouter } from "next/navigation";
import LoadingStep from "@/components/onboarding/shared/LoadingStep";
import ResultStep, { RecalculationResult } from "@/components/onboarding/shared/ResultStep";
import { Plan, PlanFamilySupport } from "@prisma/client";

// Define the Plan with familySupport relation
type PlanWithFamilySupport = Plan & {
  familySupport: PlanFamilySupport | null;
};

interface SpendingClienttProps {
  plan: PlanWithFamilySupport;
}

export default function SpendingClient({ plan }: SpendingClienttProps) {
  const [status, setStatus] = useState<'form' | 'loading' | 'result'>('form');
  const [result, setResult] = useState<RecalculationResult | null>(null);
  const router = useRouter();
  
  const handleContinue = () => {
      router.push(`/plan/${plan.id}/spending`); // Example next step
  }

  if (status === 'loading') {
      return <LoadingStep title="Dòng tiền đi ra" message="Tính toán các dòng tiền đi ra" percentage={100}/>;
  }

  if (status === 'result' && result) {
      return <ResultStep plan={result.plan} title="Dòng tiền đi ra" message={result.message} earliestPurchaseYear={result.earliestPurchaseYear} onContinue={handleContinue} />;
  }

  return (
    <Spending
      initialData={{}}
      plan={plan}
      onCompleted={handleContinue}
    />
  );
}
