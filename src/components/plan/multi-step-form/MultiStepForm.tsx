/**
 * MultiStepForm.tsx
 *
 * This is the main container component for the new multi-step plan creation wizard.
 * It manages the overall form state, the current step, navigation between steps,
 * and the final submission of the plan.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { PlanFormState, planSchema } from "./types";
import { submitPlan } from "@/actions";
import LoadingOverlay from "@/components/ui/loading-overlay";
import { Button } from "@/components/ui/button";

import { Step1_Goal } from "./steps/Step1_Goal";
import { Step2_Income } from "./steps/Step2_Income";
import { Step3_Spending } from "./steps/Step3_Spending";
import { Step4_Loan } from "./steps/Step4_Loan";

interface MultiStepFormProps {
  userId: string;
}

export default function MultiStepForm({ userId }: MultiStepFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 4;

  const form = useForm<PlanFormState>({
    resolver: zodResolver(planSchema),
    mode: "onChange",
    defaultValues: {
      yearsToPurchase: 3,
      targetHousePriceN0: 2000,
      pctHouseGrowth: 10.0,
      targetHouseType: "Chung cư",
      targetLocation: "Hồ Chí Minh",
      userMonthlyIncome: 25,
      hasCoApplicant: false,
      coApplicantMonthlyIncome: 0,
      monthlyOtherIncome: 0,
      pctSalaryGrowth: 7.0,
      coApplicantSalaryGrowth: 7.0,
      monthlyLivingExpenses: 10,
      monthlyNonHousingDebt: 0,
      currentAnnualInsurancePremium: 0,
      initialSavings: 500,
      pctExpenseGrowth: 4.0,
      pctInvestmentReturn: 9.0,
      loanInterestRate: 11.0,
      loanTermYears: 25,
      paymentMethod: "fixed",
      familySupport: {
        hasFamilySupport: false,
        familySupportType: null,
        familySupportAmount: 0,
        familyLoanInterestRate: 0,
        familyLoanRepaymentType: null,
        familyGiftTiming: null,
        familyLoanTermYears: 0,
      },
    },
  });

  const getFieldsForStep = (step: number): (keyof PlanFormState)[] => {
    switch (step) {
      case 1:
        return [
          'yearsToPurchase',
          'targetHousePriceN0',
          'targetHouseType',
          'targetLocation',
          'pctHouseGrowth',
        ];
      case 2:
        return [
          'userMonthlyIncome',
          'hasCoApplicant',
          'coApplicantMonthlyIncome',
          'monthlyOtherIncome',
          'pctSalaryGrowth',
          'coApplicantSalaryGrowth',
        ];
      case 3:
        return [
          'monthlyLivingExpenses',
          'monthlyNonHousingDebt',
          'currentAnnualInsurancePremium',
          'initialSavings',
          'pctExpenseGrowth',
          'pctInvestmentReturn',
        ];
      case 4:
        return ['loanInterestRate', 'loanTermYears', 'paymentMethod', 'familySupport'];
      default:
        return [];
    }
  };

  const handleNextStep = async () => {
    const fieldsForCurrentStep = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsForCurrentStep);
    
    if (!isValid) {
      console.log('Validation errors:', form.formState.errors);
    }

    if (isValid && currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const processSubmit = async (data: PlanFormState) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = { ...data, userId };
      const result = await submitPlan(payload);
      if (!result.success || !result.planId) {
        throw new Error(result.error || "Failed to process plan");
      }
      router.push(`/plan/${result.planId}/results`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1_Goal />;
      case 2:
        return <Step2_Income />;
      case 3:
        return <Step3_Spending />;
      case 4:
        return <Step4_Loan />;
      default:
        return <div>Invalid Step</div>;
    }
  };

  return (
    <FormProvider {...form}>
      <>
        {isSubmitting && <LoadingOverlay messages={["Đang tính toán..."]} />}
        {error && <p className="text-red-500 bg-red-100 p-3 rounded-md my-4">{error}</p>}
        
        <div className="mb-8 pt-6">
          <div className="relative h-2 bg-gray-700 rounded-full">
            <div
              className="absolute top-0 left-0 h-2 bg-cyan-500 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-center mt-2 text-gray-400">
            Bước {currentStep} trên {totalSteps}
          </p>
        </div>

        <div className="space-y-8">
          {renderStep()}
        </div>

        <div className="flex justify-between pt-8">
          <Button
            type="button"
            onClick={goToPrevStep}
            variant="outline"
            disabled={currentStep === 1}
          >
            Quay lại
          </Button>
          {currentStep < totalSteps ? (
            <Button type="button" onClick={handleNextStep}>
              Tiếp theo
            </Button>
          ) : (
            <Button
              type="button"
              onClick={form.handleSubmit(processSubmit)}
              disabled={isSubmitting}
            >
              Xem kết quả
            </Button>
          )}
        </div>
      </>
    </FormProvider>
  );
} 