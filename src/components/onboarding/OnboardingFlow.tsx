"use client";

import { useState } from "react";
import { OnboardingPlanState } from "./types";
import QuickCheck from "./sections/QuickCheck";
import SignupPrompt from "./sections/SignupPrompt";
import FamilySupport from "./sections/FamilySupport";
import Spending from "./sections/Spending";
import Assumption from "./sections/Assumption";
import { Plan } from "@prisma/client";
import { useAuth } from "@clerk/nextjs";
import { QuickCheckResultPayload, createPlanFromOnboarding } from "@/actions/createPlanFromOnboarding";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import LoadingStep from "./shared/LoadingStep";

type OnboardingSection = 'quickCheck' | 'signupPrompt'| 'familySupport' | 'spending' | 'assumptions';

// Add planId to the props
interface OnboardingFlowProps {
  planId: string;
}

export default function OnboardingFlow({ planId }: OnboardingFlowProps) {
  const [currentSection, setCurrentSection] = useState<OnboardingSection>('quickCheck');
  const [planState, setPlanState] = useState<Partial<OnboardingPlanState>>({});
  const { isSignedIn, userId } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickCheckCompleted = async (data: {
    onboardingData: Partial<OnboardingPlanState>;
    quickCheckResult: QuickCheckResultPayload;
  }) => {
    const finalOnboardingData = { ...planState, ...data.onboardingData };
    setPlanState(finalOnboardingData);

    if (isSignedIn && userId) {
      // *** NEW LOGIC FOR SIGNED-IN USERS ***
      setIsLoading(true); // Show loading indicator
      
      const result = await createPlanFromOnboarding(finalOnboardingData);
      
      if (result.success && result.planId) {
        // No need for localStorage or SignupPrompt. Redirect directly.
        router.push(`/plan/${result.planId}/familysupport`);
      } else {
        toast.error(result.error || "Không thể tạo kế hoạch. Vui lòng thử lại.");
        setIsLoading(false);
      }

    } else {
      // *** EXISTING LOGIC FOR GUEST USERS ***
      // Save to localStorage and show the SignupPrompt
      localStorage.setItem("pendingOnboardingPlan", JSON.stringify(finalOnboardingData));
      setCurrentSection('signupPrompt');
    }
  };

  const handleFamilySupportCompleted = (data: Partial<OnboardingPlanState>) => {
    setPlanState(prev => ({ ...prev, ...data }));
    setCurrentSection('spending');
  };

  const handleSpendingCompleted = (data: Partial<OnboardingPlanState>) => {
    setPlanState(prev => ({ ...prev, ...data }));
    setCurrentSection('assumptions');
  };

  const handleBackFromPrompt = () => {
    setCurrentSection('quickCheck');
  };
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingStep message="Đang khởi tạo kế hoạch của bạn..." percentage={100} />
      </div>
    );
  }

  const renderSection = () => {
    switch (currentSection) {
      case 'quickCheck':
        return <QuickCheck planId={planId} initialData={planState} onCompleted={handleQuickCheckCompleted} />;
      case 'signupPrompt':
        return <SignupPrompt planData={planState} onBack={handleBackFromPrompt} />;
      case 'familySupport':
        // Now we pass the correct planId from props
        return <FamilySupport initialData={planState} familySupport={planState} planId={planId} onSubmit={handleFamilySupportCompleted} />;
      case 'spending':
        return <Spending initialData={planState} plan={planState} onCompleted={handleSpendingCompleted} planId={planId} isEditMode={false}/>;
      case 'assumptions':
        return <Assumption plan={planState as Plan} onFinalChoice={() => {}} onConfirm={() => {}} step="intro" setStep={() => {}} assumptionStep={0} onNext={() => {}} onPrev={() => {}} result={null} assumptions={{pctSalaryGrowth: 0, pctHouseGrowth: 0, pctInvestmentReturn: 0}} onSliderChange={() => {}} chartData={[]}/>;
      default:
        return <QuickCheck onCompleted={handleQuickCheckCompleted} />;
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-950 text-white p-4 sm:p-6">
      <div className="w-full max-w-5xl flex flex-col h-full flex-1">
        {renderSection()}
      </div>
    </div>
  );
}
