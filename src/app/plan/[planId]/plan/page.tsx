import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import PlanPageClient from "@/components/plan/plan/PlanPageClient";

export default async function PlanPage({
  params,
}: {
  params: { planId: string; milestoneId: string };
}) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const planData = await db.plan.findUnique({
    where: { id: params.planId, userId: user.id },
    include: { familySupport: true },
  });

  if (!planData) {
    redirect("/dashboard");
  }
  
  return <PlanPageClient initialPlan={planData}/>;
} 