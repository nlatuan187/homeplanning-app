import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { ProjectionRow } from "@/lib/calculations/affordability";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ResultsScenarioA from "./scenario-a";
import ResultsScenarioB from "./scenario-b";
import ResultsHeader from "./ResultsHeader";
import ResultsClient from "./ResultsClient";

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

  const projectionData = generateProjections(plan as any);
  console.log("projectionData", projectionData);
  console.log("plan", plan);
  const targetYear = new Date().getFullYear() + plan.yearsToPurchase;
  const targetYearProjection: ProjectionRow | undefined =
    projectionData[plan.yearsToPurchase];

  if (!targetYearProjection) {
    return <div>Error: Could not calculate projection for the target year.</div>;
  }

  return (
    <ResultsClient plan={plan} firstYearProjection={targetYearProjection} />
  );
}