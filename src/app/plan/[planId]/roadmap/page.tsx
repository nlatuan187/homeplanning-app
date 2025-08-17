import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import RoadmapClient from "../../../../components/plan/roadmap/RoadmapClient";

export default async function RoadmapPage({
  params,
}: {
  params: { planId: string };
}) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const plan = await db.plan.findUnique({
    where: { id: params.planId, userId: user.id },
    include: { 
      familySupport: true,
      milestoneProgress: true 
    },
  });

  if (!plan) {
    redirect("/dashboard");
  }
  
  // Sử dụng dữ liệu từ milestoneProgress nếu có
  const projections = generateProjections(plan);
  const currentProjection = projections.find(p => p.year === plan.confirmedPurchaseYear) || projections[0];
  const housePriceProjected = (plan.milestoneProgress?.housePriceProjected || 0);
  const cumulativeGoal = housePriceProjected - currentProjection.loanAmountNeeded;
  const savingsPercentage = Math.round(((plan.milestoneProgress?.currentSavings || 0) / cumulativeGoal) * 100);

  return (
    <RoadmapClient 
      plan={plan}
      savingsPercentage={savingsPercentage}
      housePriceProjected={housePriceProjected}
      cumulativeGoal={cumulativeGoal}
    />
  );
}
