"use client";

import { useState } from "react";
import { OnboardingPlanState } from "./types";
import QuickCheck from "./sections/QuickCheck";
import SignupPrompt from "./sections/SignupPrompt";

type OnboardingSection = 'quickCheck' | 'signupPrompt';

export default function OnboardingFlow() {
  const [currentSection, setCurrentSection] = useState<OnboardingSection>('quickCheck');
  const [planState, setPlanState] = useState<Partial<OnboardingPlanState>>({});

  const handleQuickCheckCompleted = (data: Partial<OnboardingPlanState>) => {
    // Save the data from the form and move to the signup prompt screen
    setPlanState(prev => ({ ...prev, ...data }));
    setCurrentSection('signupPrompt');
  };

  const handleBackFromPrompt = () => {
    // Allow the user to go back and edit their answers
    setCurrentSection('quickCheck');
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'quickCheck':
        return <QuickCheck onCompleted={handleQuickCheckCompleted} />;
      case 'signupPrompt':
        return <SignupPrompt planData={planState} onBack={handleBackFromPrompt} />;
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
