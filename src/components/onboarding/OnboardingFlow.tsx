"use client";

import { useState } from "react";
import { OnboardingPlanState } from "./types";
import QuickCheck from "./sections/QuickCheck";
import SignupPrompt from "./sections/SignupPrompt";
import FamilySupport from "./sections/FamilySupport";

type OnboardingSection = 'quickCheck' | 'signupPrompt'| 'familySupport' | 'spending' | 'assumptions';

// Add planId to the props
interface OnboardingFlowProps {
  planId: string;
}

export default function OnboardingFlow({ planId }: OnboardingFlowProps) {
  const [currentSection, setCurrentSection] = useState<OnboardingSection>('quickCheck');
  const [planState, setPlanState] = useState<Partial<OnboardingPlanState>>({});

  const handleQuickCheckCompleted = (data: Partial<OnboardingPlanState>) => {
    setPlanState(prev => ({ ...prev, ...data }));
    setCurrentSection('signupPrompt');
  };

  const handleFamilySupportCompleted = (data: Partial<OnboardingPlanState>) => {
    setPlanState(prev => ({ ...prev, ...data }));
    setCurrentSection('spending');
  };

  const handleBackFromPrompt = () => {
    setCurrentSection('quickCheck');
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'quickCheck':
        return <QuickCheck onCompleted={handleQuickCheckCompleted} />;
      case 'signupPrompt':
        return <SignupPrompt planData={planState} onBack={handleBackFromPrompt} />;
      case 'familySupport':
        // Now we pass the correct planId from props
        return <FamilySupport initialData={planState} planId={planId} />;
      default:
        return <QuickCheck onCompleted={handleQuickCheckCompleted} />;
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-950 text-white p-4 sm:p-6">
      <div className="w-full max-w-md flex flex-col h-full flex-1">
        {renderSection()}
      </div>
    </div>
  );
}
