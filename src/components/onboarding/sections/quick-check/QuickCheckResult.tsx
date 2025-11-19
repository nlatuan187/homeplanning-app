"use client";

import { QuickCheckResultPayload } from "@/actions/createPlanFromOnboarding";
import { PlanWithDetails } from "@/lib/calculations/projections/generateProjections";
import { ProjectionRow } from "@/lib/calculations/affordability";
import ResultsClient from "../ResultsClient";
import { OnboardingPlanState } from "../../types";

interface QuickCheckResultProps {
    result: QuickCheckResultPayload;
    formData: Partial<OnboardingPlanState>;
    onNext: () => void;
    onBack: () => void;
}

export default function QuickCheckResult({ result, formData, onNext, onBack }: QuickCheckResultProps) {
    const yearsToPurchase = (formData.yearsToPurchase ?? new Date().getFullYear()) - new Date().getFullYear();

    const partialPlan: Partial<PlanWithDetails> = {
        yearsToPurchase: yearsToPurchase,
        hasCoApplicant: formData.hasCoApplicant ?? false,
        targetHousePriceN0: (formData.targetHousePriceN0 ?? 0) * 1000,
        initialSavings: formData.initialSavings ?? 0,
        userMonthlyIncome: formData.userMonthlyIncome ?? 0,
        monthlyLivingExpenses: formData.monthlyLivingExpenses ?? 0,
        confirmedPurchaseYear: formData.yearsToPurchase ?? 0,
        pctSalaryGrowth: 7.0,
        pctHouseGrowth: 10.0,
        pctInvestmentReturn: 11.0,
        pctExpenseGrowth: 4.0,
        loanInterestRate: 11.0,
        loanTermYears: 25,
        monthlyNonHousingDebt: 0,
        currentAnnualInsurancePremium: 0,
        hasNewChild: false,
        yearToHaveChild: 0,
        monthlyChildExpenses: 0,
        paymentMethod: "fixed",
        coApplicantSalaryGrowth: 7.0,
    };

    const projectionData = result.projectionData;
    const targetYearProjection: ProjectionRow | undefined =
        projectionData?.find(p => p.isAffordable);

    const displayPlan = { ...partialPlan };

    return (
        <ResultsClient
            plan={displayPlan as any}
            firstYearProjection={targetYearProjection}
            onNext={onNext}
            onBack={onBack}
        />
    );
}
