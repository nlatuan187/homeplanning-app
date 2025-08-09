import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import MilestoneTimeline from "@/components/plan/roadmap/MilestoneTimeline";
import { Plan } from "@prisma/client";
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
  let savingsPercentage = 0;
  let housePriceProjected = plan.targetHousePriceN0;

  if (plan.milestoneProgress) {
    savingsPercentage = plan.milestoneProgress.savingsPercentage;
    housePriceProjected = plan.milestoneProgress.housePriceProjected;
  } else {
    // Fallback: tính toán từ plan nếu chưa có milestoneProgress
    const projections = generateProjections(plan);
    const currentProjection = projections.find(p => p.year === plan.confirmedPurchaseYear) || projections[0];
    housePriceProjected = currentProjection.housePriceProjected ?? plan.targetHousePriceN0;
    savingsPercentage = Math.round((plan.initialSavings / plan.targetHousePriceN0) * 100);
  }

  return (
    <RoadmapClient 
      plan={plan}
      savingsPercentage={savingsPercentage}
      housePriceProjected={housePriceProjected}
    />
  );
}
