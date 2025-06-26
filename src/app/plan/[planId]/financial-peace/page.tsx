import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { FinancialPeaceClient } from "./FinancialPeaceClient"; // Create this new client component

interface FinancialPeacePageProps {
  params: {
    planId: string;
  };
}

export default async function FinancialPeacePage({ params }: FinancialPeacePageProps) {
  const { planId } = await params;
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

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
  
  if (!plan.confirmedPurchaseYear) {
    // This state should ideally not be reachable if the flow is correct,
    // but as a safeguard, redirect them back to the results page.
    redirect(`/plan/${planId}/results`);
  }

  // Calculate the number of years to project to ensure it includes the confirmed year.
  const yearsToProject = plan.confirmedPurchaseYear - new Date().getFullYear();
  // Ensure we project for at least the originally intended duration as a fallback.
  const maxYears = Math.max(yearsToProject, plan.yearsToPurchase + 5);

  const projectionData = generateProjections(plan, maxYears);

  // The client component expects an object with a projectionData property.
  const affordabilityResult = {
    projectionData: projectionData,
  };
  
  return (
    <FinancialPeaceClient plan={plan} affordabilityResult={affordabilityResult} />
  );
}
