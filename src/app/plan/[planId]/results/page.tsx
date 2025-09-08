import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { ProjectionRow } from "@/lib/calculations/affordability";
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

  // Generate the full projection data on the server
  const projectionData = generateProjections(plan as any);
  console.log("projectionData", projectionData);
  console.log("plan", plan);
  const targetYear = new Date().getFullYear() + plan.yearsToPurchase;
  // The first year projection is simply the first viable year from the projection data.
  const targetYearProjection: ProjectionRow | undefined =
    projectionData.find(p => p.isAffordable);
  console.log("targetYearProjection", targetYearProjection);

  if (!targetYearProjection) {
    return <div>Error: Could not calculate projection for the target year.</div>;
  }

  return (
    <ResultsClient plan={plan} firstYearProjection={targetYearProjection} />
  );
}