"use client";

import { useState } from "react";
import { OnboardingPlanState } from "./types";
import QuickCheck from "./sections/QuickCheck";
import SignupPrompt from "./sections/SignupPrompt";
import FamilySupport from "./sections/FamilySupport";
import Spending from "./sections/Spending";
import Assumption from "./sections/Assumption";
import { Plan } from "@prisma/client";
import { useUser } from "@clerk/nextjs";

type OnboardingSection = 'quickCheck' | 'signupPrompt'| 'familySupport' | 'spending' | 'assumptions';

// Add planId to the props
interface OnboardingFlowProps {
  planId: string;
}

export default function OnboardingFlow({ planId }: OnboardingFlowProps) {
  const [currentSection, setCurrentSection] = useState<OnboardingSection>('quickCheck');
  const [planState, setPlanState] = useState<Partial<OnboardingPlanState>>({});
  const { isSignedIn } = useUser();

  const handleQuickCheckCompleted = (data: Partial<OnboardingPlanState>) => {
    setPlanState(prev => ({ ...prev, ...data }));
    if (isSignedIn) {
      setCurrentSection('familySupport');
    } else {
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

  const renderSection = () => {
    switch (currentSection) {
      case 'quickCheck':
        return <QuickCheck onCompleted={handleQuickCheckCompleted} />;
      case 'signupPrompt':
        return <SignupPrompt planData={planState} onBack={handleBackFromPrompt} />;
      case 'familySupport':
        // Now we pass the correct planId from props
        return <FamilySupport initialData={planState} familySupport={planState} planId={planId} onCompleted={handleFamilySupportCompleted} />;
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
