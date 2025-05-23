import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { calculateAffordability, ProjectionRow } from "@/lib/calculations/affordability";
// Card components removed as they are no longer used in this file
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ResultsScenarioA from "./scenario-a";
import ResultsScenarioB from "./scenario-b";
// import AdvancedAnalysis from "@/components/plan/advanced-analysis";

interface ResultsPageProps {
  params: {
    planId: string;
  };
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  // Await the params
  const { planId } = await params;

  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get the plan from the database
  const plan = await db.plan.findUnique({
    where: {
      id: planId,
      userId: user.id,
    },
    select: { // Add explicit select to avoid requesting removed columns
      id: true,
      userId: true,
      planName: true,
      createdAt: true,
      updatedAt: true,
      yearsToPurchase: true,
      targetHousePriceN0: true,
      targetHouseType: true,
      targetLocation: true,
      maritalStatus: true,
      hasDependents: true,
      numberOfDependents: true,
      plansMarriageBeforeTarget: true,
      targetMarriageYear: true,
      plansChildBeforeTarget: true,
      targetChildYear: true,
      initialSavingsGoal: true,
      incomeLastYear: true,
      monthlyOtherIncome: true,
      monthlyLivingExpenses: true,
      monthlyNonHousingDebt: true,
      currentAnnualInsurancePremium: true,
      spouseMonthlyIncome: true,
      pctHouseGrowth: true,
      pctSalaryGrowth: true,
      pctExpenseGrowth: true,
      pctInvestmentReturn: true,
      factorMarriage: true,
      factorChild: true,
      loanInterestRate: true,
      loanTermMonths: true,
      // paymentMethod: true, // Removed as it's not used on this page and causing TS error
      affordabilityOutcome: true,
      firstViableYear: true,
      confirmedPurchaseYear: true,
      // Do not select the removed report cache fields:
      // reportRiskManagement, reportFuturePlanning
      // Keep the ones that are still in the schema:
      reportGeneratedAt: true,
      reportAssetEfficiency: true,
      reportCapitalStructure: true,
      reportSpendingPlan: true,
      reportInsurance: true,
      reportBackupPlans: true,
      revisionCount: true,
      userEmail: true,
      buffer: true,
      revisionHistory: true, // Added missing field
    }
  });

  if (!plan) {
    redirect("/dashboard");
  }

  // We don't need to recalculate affordability here since it's already done in the submitPlan action
  // Just use the stored values from the database

  // If for some reason the affordability outcome is not set, calculate it
  let affordabilityResult;
  if (!plan.affordabilityOutcome || plan.firstViableYear === null) {
    affordabilityResult = calculateAffordability(plan);

    // Update the plan with the affordability outcome and first viable year
    await db.plan.update({
      where: {
        id: planId,
      },
      data: {
        affordabilityOutcome: affordabilityResult.affordabilityOutcome,
        firstViableYear: affordabilityResult.firstViableYear,
      },
    });
  } else {
    // Use the stored values but still calculate the projections for display
    affordabilityResult = calculateAffordability(plan);
  }

  // Get current year
  const currentYear = new Date().getFullYear();

  // Calculate target year
  const targetYear = currentYear + plan.yearsToPurchase;

  // Get the target year projection
  const targetYearProjection: ProjectionRow = affordabilityResult.projectionData[plan.yearsToPurchase];

  // Check if the plan is affordable based on the stored outcome
  // const isActuallyAffordable = targetYearProjection.buffer >= 0;

  return (
    <main className="min-h-screen bg-slate-950 p-4">
      <div className="container mx-auto max-w-5xl">
        <header className="flex justify-between items-center py-6">
          <h1 className="text-2xl font-bold">Kết quả Phân tích</h1>
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">Quay lại Dashboard</Link>
            </Button>
          </div>
        </header>

        <div className="space-y-8">
          {plan.affordabilityOutcome === "ScenarioA" ? (
            <ResultsScenarioA
              planId={planId}
              targetYear={targetYear}
              projection={targetYearProjection}
              firstViableYear={plan.firstViableYear}
              projectionData={affordabilityResult.projectionData}
              planLoanInterestRate={plan.loanInterestRate}
              planLoanTermMonths={plan.loanTermMonths}
            />
          ) : (
            <ResultsScenarioB
              planId={planId}
              targetYear={targetYear}
              firstViableYear={plan.firstViableYear!}
              projectionData={affordabilityResult.projectionData}
              planLoanInterestRate={plan.loanInterestRate}
              planLoanTermMonths={plan.loanTermMonths}
            />
          )}

          {/* The "Khám Phá Lộ Trình An Tâm" card has been removed as navigation is now direct */}
        </div>
      </div>
    </main>
  );
}
