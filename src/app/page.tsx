"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { checkUserHasPlan } from '@/actions/userActions'; 
import LoadingStep from "@/components/onboarding/shared/LoadingStep";

export default function Home() {
  const { isSignedIn, userId, isLoaded } = useAuth();
  const router = useRouter();
  const [isCheckingPlan, setIsCheckingPlan] = useState(true);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      checkUserHasPlan(userId).then(hasPlan => {
        if (hasPlan) {
          router.push('/dashboard');
        } else {
          // User is signed in but has no plan; they should start onboarding.
          setIsCheckingPlan(false);
        }
      });
    } else if (isLoaded && !isSignedIn) {
      // Guest user.
      setIsCheckingPlan(false);
    }
  }, [isLoaded, isSignedIn, userId, router]);

  if (!isLoaded || isCheckingPlan) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingStep message="Đang tải..." percentage={100} />
      </div>
    );
  }

  // Both guests and new users without a plan will see the OnboardingFlow.
  return <OnboardingFlow planId={""} />;
}
