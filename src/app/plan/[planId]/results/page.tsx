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
  const targetYearProjection: ProjectionRow | undefined =
    projectionData.find(p => p.isAffordable)
  console.log("projectionData", projectionData);

  await db.plan.update({
    where: {
      id: planId,
    },
    data: {
      firstViableYear: targetYearProjection?.year,
    },
  });
  
  return (
    <ResultsClient plan={plan} firstYearProjection={targetYearProjection} />
  );
}