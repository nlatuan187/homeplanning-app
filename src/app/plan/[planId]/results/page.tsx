import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { ProjectionRow } from "@/lib/calculations/affordability";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ResultsScenarioA from "./scenario-a";
import ResultsScenarioB from "./scenario-b";

interface ResultsPageProps {
  params: {
    planId: string;
  };
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { planId } = await params;
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get the plan from the database using the resolved planId
  const plan = await db.plan.findUnique({
    where: {
      id: planId,
      userId: user.id,
    },
    include: {
      familySupport: true,
    },
  });

  if (!plan) {
    redirect("/dashboard");
  }

  const projectionData = generateProjections(plan);
  console.log("projectionData", projectionData);
  console.log("plan", plan);
  const targetYear = new Date().getFullYear() + plan.yearsToPurchase;
  const targetYearProjection: ProjectionRow | undefined =
    projectionData[plan.yearsToPurchase];

  if (!targetYearProjection) {
    return <div>Error: Could not calculate projection for the target year.</div>;
  }

  return (
    <main className="min-h-screen bg-black text-white p-2 md:p-4">
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
              plan={plan}
              targetYear={targetYear}
              projection={targetYearProjection}
              firstViableYear={plan.firstViableYear}
              projectionData={projectionData}
              planLoanInterestRate={plan.loanInterestRate}
              planLoanTermYears={plan.loanTermYears}
            />
          ) : (
            <ResultsScenarioB
              plan={plan}
              targetYear={targetYear}
              firstViableYear={plan.firstViableYear!}
              projectionData={projectionData}
              planLoanInterestRate={plan.loanInterestRate}
              planLoanTermYears={plan.loanTermYears}
            />
          )}
        </div>
      </div>
    </main>
  );
}