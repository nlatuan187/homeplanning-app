import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MultiStepForm from "@/components/plan/multi-step-form/MultiStepForm";
import { db } from "@/lib/db";
import { PlanFormState } from "@/components/plan/multi-step-form/types";

// Page component now accepts searchParams
export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  let planData: (PlanFormState & { id: string }) | undefined = undefined;
  const planIdToEdit = searchParams.edit as string;

  // If there is an 'edit' param in the URL, fetch the plan data
  if (planIdToEdit) {
    const existingPlan = await db.plan.findUnique({
      where: {
        id: planIdToEdit,
        userId: userId, // Ensure user owns the plan
      },
      include: {
        familySupport: true,
      },
    });

    if (existingPlan) {
      // Map the database model to the form state
      planData = {
        id: existingPlan.id,
        yearsToPurchase: existingPlan.yearsToPurchase,
        targetHousePriceN0: existingPlan.targetHousePriceN0,
        pctHouseGrowth: existingPlan.pctHouseGrowth,
        targetHouseType: existingPlan.targetHouseType,
        targetLocation: existingPlan.targetLocation,
        userMonthlyIncome: existingPlan.userMonthlyIncome,
        hasCoApplicant: existingPlan.hasCoApplicant,
        coApplicantMonthlyIncome: existingPlan.coApplicantMonthlyIncome,
        monthlyOtherIncome: existingPlan.monthlyOtherIncome,
        pctSalaryGrowth: existingPlan.pctSalaryGrowth,
        coApplicantSalaryGrowth: existingPlan.coApplicantSalaryGrowth,
        monthlyLivingExpenses: existingPlan.monthlyLivingExpenses,
        monthlyNonHousingDebt: existingPlan.monthlyNonHousingDebt,
        currentAnnualInsurancePremium: existingPlan.currentAnnualInsurancePremium,
        initialSavings: existingPlan.initialSavings,
        pctExpenseGrowth: existingPlan.pctExpenseGrowth,
        pctInvestmentReturn: existingPlan.pctInvestmentReturn,
        loanInterestRate: existingPlan.loanInterestRate,
        loanTermYears: existingPlan.loanTermYears,
        paymentMethod: existingPlan.paymentMethod,
        familySupport: {
          hasFamilySupport: !!existingPlan.familySupport?.familySupportType,
          familySupportType: existingPlan.familySupport?.familySupportType ?? null,
          familySupportAmount: existingPlan.familySupport?.familySupportAmount ?? 0,
          familyLoanInterestRate: existingPlan.familySupport?.familyLoanInterestRate ?? 0,
          familyLoanRepaymentType: existingPlan.familySupport?.familyLoanRepaymentType ?? null,
          familyGiftTiming: existingPlan.familySupport?.familyGiftTiming ?? null,
          familyLoanTermYears: existingPlan.familySupport?.familyLoanTermYears ?? 0,
        },
      };
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-2 md:p-4">
      <div className="container mx-auto max-w-5xl">
        {/* Pass the fetched plan data to the form component */}
        <MultiStepForm userId={userId} plan={planData} />
      </div>
    </main>
  );
}
