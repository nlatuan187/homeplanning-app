"use client";

import { useState, Fragment } from "react"; // Added Fragment
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import LoadingOverlay from "@/components/ui/loading-overlay"; // Import LoadingOverlay
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import GoalSection from "./sections/goal-section";
import SituationSection from "./sections/situation-section";
import FinancesSection from "./sections/finances-section";
import FuturePlansSection from "./sections/future-plans-section";
import AssumptionsSection from "./sections/assumptions-section";
import ReviewSection from "./sections/review-section";
import { submitPlan } from "@/actions";

// Define the form sections
const SECTIONS = [
  "goal",
  "finances",
  "situation",
  "futurePlans",
  "assumptions",
  "review",
] as const;

export type SectionType = typeof SECTIONS[number];

// Initial form state
const initialFormState = {
  // Goal Inputs
  yearsToPurchase: 3,
  targetHousePriceN0: 2000, // in million VND
  targetHouseType: "Chung cư",
  targetLocation: "Hồ Chí Minh",

  // User Data Inputs
  maritalStatus: "Độc thân",
  hasDependents: false,
  numberOfDependents: 0,
  buyTogetherFlag: false,
  plansMarriageBeforeTarget: false,
  targetMarriageYear: null as number | null,
  plansChildBeforeTarget: false,
  targetChildYear: null as number | null,

  // Financial Inputs
  initialSavingsGoal: 500, // in million VND
  incomeLastYear: 300, // in million VND
  monthlyOtherIncome: 0, // in million VND
  monthlyLivingExpenses: 10, // in million VND
  monthlyNonHousingDebt: 0, // in million VND
  currentAnnualInsurancePremium: 0, // in million VND
  spouseMonthlyIncome: 0, // in million VND

  // Assumptions/Overrides
  pctHouseGrowth: 10.0,
  pctSalaryGrowth: 7.0,
  pctExpenseGrowth: 4.0,
  pctInvestmentReturn: 11.0,
  factorMarriage: 60.0,
  factorChild: 40.0,
  loanInterestRate: 11.0,
  loanTermMonths: 300,
  paymentMethod: "fixed" as "fixed" | "decreasing",
};

export type FormState = typeof initialFormState;

// Define a type for the existing plan data
export type ExistingPlanData = {
  id: string;
  yearsToPurchase: number;
  targetHousePriceN0: number;
  targetHouseType: string | null;
  targetLocation: string | null;
  maritalStatus: string;
  hasDependents: boolean;
  numberOfDependents: number;
  buyTogetherFlag?: boolean;
  plansMarriageBeforeTarget: boolean;
  targetMarriageYear: number | null;
  plansChildBeforeTarget: boolean;
  targetChildYear: number | null;
  initialSavingsGoal: number;
  incomeLastYear: number;
  monthlyOtherIncome: number;
  monthlyLivingExpenses: number;
  monthlyNonHousingDebt: number;
  currentAnnualInsurancePremium: number;
  spouseMonthlyIncome: number;
  pctHouseGrowth: number;
  pctSalaryGrowth: number;
  pctExpenseGrowth: number;
  pctInvestmentReturn: number;
  factorMarriage: number;
  factorChild: number;
  loanInterestRate: number;
  loanTermMonths: number;
  // Allow other properties with more specific types
  revisionCount?: number;
  revisionHistory?: Record<string, unknown>[];
  userEmail?: string;
  buffer?: number;
  [key: string]: unknown; // Allow other properties with unknown type
};

interface PlanFormProps {
  userId: string;
  existingPlan?: ExistingPlanData; // Plan data for editing mode
  editMode?: boolean;
  startSection?: SectionType; // Optional starting section
}

export default function PlanForm({ userId, existingPlan, editMode = false, startSection }: PlanFormProps) {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<SectionType>(startSection || "goal");
  const [formState, setFormState] = useState<FormState>(() => {
    // If in edit mode and existingPlan is provided, pre-populate the form
    if (editMode && existingPlan) {
      // Map existingPlan data to formState format
      return {
        // Goal Inputs
        yearsToPurchase: existingPlan.yearsToPurchase,
        targetHousePriceN0: existingPlan.targetHousePriceN0,
        targetHouseType: existingPlan.targetHouseType || "Chung cư",
        targetLocation: existingPlan.targetLocation || "Hồ Chí Minh",

        // User Data Inputs
        maritalStatus: existingPlan.maritalStatus,
        hasDependents: existingPlan.hasDependents,
        numberOfDependents: existingPlan.numberOfDependents || 0,
        buyTogetherFlag: existingPlan.buyTogetherFlag || false,
        plansMarriageBeforeTarget: existingPlan.plansMarriageBeforeTarget || false,
        targetMarriageYear: existingPlan.targetMarriageYear,
        plansChildBeforeTarget: existingPlan.plansChildBeforeTarget || false,
        targetChildYear: existingPlan.targetChildYear,

        // Financial Inputs
        initialSavingsGoal: existingPlan.initialSavingsGoal,
        incomeLastYear: existingPlan.incomeLastYear,
        monthlyOtherIncome: existingPlan.monthlyOtherIncome,
        monthlyLivingExpenses: existingPlan.monthlyLivingExpenses,
        monthlyNonHousingDebt: existingPlan.monthlyNonHousingDebt,
        currentAnnualInsurancePremium: existingPlan.currentAnnualInsurancePremium,
        spouseMonthlyIncome: existingPlan.spouseMonthlyIncome || 0,

        // Assumptions/Overrides
        pctHouseGrowth: existingPlan.pctHouseGrowth,
        pctSalaryGrowth: existingPlan.pctSalaryGrowth,
        pctExpenseGrowth: existingPlan.pctExpenseGrowth,
        pctInvestmentReturn: existingPlan.pctInvestmentReturn,
        factorMarriage: existingPlan.factorMarriage,
        factorChild: existingPlan.factorChild,
        loanInterestRate: existingPlan.loanInterestRate,
        loanTermMonths: existingPlan.loanTermMonths,
        paymentMethod: (existingPlan.paymentMethod as "fixed" | "decreasing") || "fixed",
      };
    }
    
    // Otherwise, use the initial form state
    return initialFormState;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the current section index
  const currentSectionIndex = SECTIONS.indexOf(currentSection);

  // Handle next section
  const handleNext = () => {
    const nextIndex = currentSectionIndex + 1;
    if (nextIndex < SECTIONS.length) {
      setCurrentSection(SECTIONS[nextIndex]);
      window.scrollTo(0, 0);
    }
  };

  // Handle previous section
  const handlePrevious = () => {
    const prevIndex = currentSectionIndex - 1;
    if (prevIndex >= 0) {
      setCurrentSection(SECTIONS[prevIndex]);
      window.scrollTo(0, 0);
    }
  };

  // Handle form submission using the server action
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Use the submitPlan server action
      // Note: The submitPlan action handles both creating new plans and updating existing ones
      // Include the userId and planId (if editing) in the form data
      const formData = {
        ...formState,
        userId, // Include the userId in the form data
        planId: editMode && existingPlan ? existingPlan.id : undefined, // Include the planId if editing
      };
      
      const result = await submitPlan(formData);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to process plan");
      }
      
      // Redirect to the results page
      router.push(`/plan/${result.planId}/results`);
    } catch (error) {
      console.error("Error submitting form:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
      setIsSubmitting(false);
    }
  };

  // Render the current section
  const renderSection = () => {
    switch (currentSection) {
      case "goal":
        return <GoalSection formState={formState} setFormState={setFormState} />;
      case "situation":
        return <SituationSection formState={formState} setFormState={setFormState} />;
      case "finances":
        return <FinancesSection formState={formState} setFormState={setFormState} />;
      case "futurePlans":
        return <FuturePlansSection formState={formState} setFormState={setFormState} />;
      case "assumptions":
        return <AssumptionsSection formState={formState} setFormState={setFormState} />;
      case "review":
        return <ReviewSection formState={formState} />;
      default:
        return null;
    }
  };

  // Get section title
  const getSectionTitle = () => {
    switch (currentSection) {
      case "goal":
        return "Mục tiêu của bạn";
      case "situation":
        return "Tình trạng hiện tại";
      case "finances":
        return "Tài chính của bạn";
      case "futurePlans":
        return "Kế hoạch tương lai";
      case "assumptions":
        return "Các giả định của bạn";
      case "review":
        return "Xem lại thông tin";
      default:
        return "";
    }
  };

  return (
    <Fragment> {/* Use Fragment to wrap Card and LoadingOverlay */}
      {isSubmitting && (
        <LoadingOverlay
          messages={["Đang xử lý..."]}
          durations={[3000]} // 5 seconds
          onSequenceComplete={() => {
            // This callback is mostly a fallback. 
            // If navigation due to submitPlan success is faster than 7s, this component unmounts.
            // If submitPlan errors out and sets isSubmitting to false, this also might not run or be needed.
            // However, if for some reason the overlay is still shown after 7s and no error/navigation,
            // this will hide it.
            if (isSubmitting) { // Check if still submitting to avoid race conditions if error already handled it
              setIsSubmitting(false);
            }
          }}
        />
      )}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
          {editMode ? "Chỉnh sửa kế hoạch" : "Tạo kế hoạch mới"}: {getSectionTitle()}
        </CardTitle>
        <CardDescription>
          {currentSectionIndex + 1} / {SECTIONS.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderSection()}
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-md">
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentSectionIndex === 0 || isSubmitting}
        >
          Quay lại
        </Button>
        {currentSection === "review" ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Đang xử lý..." : "Tính toán Kế hoạch"}
          </Button>
        ) : (
          <Button onClick={handleNext}>Tiếp tục</Button>
        )}
      </CardFooter>
    </Card>
  </Fragment>
  );
}
