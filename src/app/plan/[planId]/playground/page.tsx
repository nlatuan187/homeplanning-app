import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { ProjectionRow } from "@/lib/calculations/affordability";
import PlaygroundA from "./playground-a";
import PlaygroundB from "./playground-b";

interface PlaygroundsPageProps {
  params: {
    planId: string;
  };
}

export default async function ResultsPage({ params }: PlaygroundsPageProps) {
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
  const targetYear = new Date().getFullYear() + plan.yearsToPurchase;
  const targetYearProjection: ProjectionRow | undefined =
    projectionData[plan.yearsToPurchase];

  if (!targetYearProjection) {
    return <div>Error: Could not calculate projection for the target year.</div>;
  }

  return (
    <main className="min-h-screen bg-black text-white p-2 md:p-4">
      <div className="container mx-auto max-w-5xl">
        <div className="space-y-8">
          {plan.affordabilityOutcome === "ScenarioB" ? (
            <PlaygroundB
              plan={plan}
              targetYear={targetYear}
              projection={targetYearProjection}
              firstViableYear={plan.firstViableYear}
              projectionData={projectionData}
              planLoanInterestRate={plan.loanInterestRate}
              planLoanTermYears={plan.loanTermYears}/>
          ) : (
            <PlaygroundA
              plan={plan}
              targetYear={targetYear}
              projection={targetYearProjection}
              firstViableYear={plan.firstViableYear}
              projectionData={projectionData}
              planLoanInterestRate={plan.loanInterestRate}
              planLoanTermYears={plan.loanTermYears}/>
          )}
        </div>
      </div>
    </main>
  );
}