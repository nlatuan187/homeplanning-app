import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import PlanPageClient from "@/components/plan/plan/PlanPageClient";

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: { planId: string };
  searchParams: { milestoneId?: string };
}) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const planData = await db.plan.findUnique({
    where: { id: params.planId, userId: user.id },
    include: { 
      familySupport: true,
      milestoneProgress: true 
    },
  });

  if (!planData) {
    redirect("/dashboard");
  }
  
  return <PlanPageClient initialPlan={planData} initialMilestoneId={searchParams.milestoneId ? parseInt(searchParams.milestoneId) : undefined}/>;
} 