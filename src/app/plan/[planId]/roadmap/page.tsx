import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import RoadmapClient from "@/components/plan/roadmap/RoadmapClient";
import { getOrCreateFullMilestoneData, getProjectionsWithCache } from "@/actions/milestoneProgress";
import { MilestoneGroup } from "@/lib/isMilestoneUnlocked";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";

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
    include: { familySupport: true },
  });

  if (!plan) {
    redirect("/dashboard");
  }
  
  const { progress, roadmap } = await getOrCreateFullMilestoneData(params.planId, user.id);

  if (!progress || !roadmap) {
    // Xử lý trường hợp không tìm thấy dữ liệu tiến trình
    return <div>Không thể tải dữ liệu lộ trình.</div>;
  }
  
  // Tính toán các giá trị cần thiết
  const housePriceProjected = progress.housePriceProjected;
  const projections = await getProjectionsWithCache(params.planId, user.id);
  const purchaseYear = plan.confirmedPurchaseYear ?? new Date(plan.createdAt).getFullYear() + plan.yearsToPurchase;
  const purchaseProjection = projections.projections.find(p => p.year === purchaseYear) || projections.projections[0];
  const cumulativeGoal = housePriceProjected - purchaseProjection.loanAmountNeeded;
  const savingsPercentage = cumulativeGoal > 0 ? Math.round((progress.currentSavings / cumulativeGoal) * 100) : 0;
  
  // Lấy và xử lý milestoneGroups
  const milestoneGroups = roadmap.milestoneGroups as unknown as MilestoneGroup[] || [];

  return (
    <RoadmapClient 
      plan={plan}
      savingsPercentage={savingsPercentage}
      housePriceProjected={housePriceProjected}
      cumulativeGoal={cumulativeGoal}
      milestoneGroups={milestoneGroups}
      currentSavings={progress.currentSavings}
    />
  );
}
