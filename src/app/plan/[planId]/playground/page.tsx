import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import PlaygroundPageClient from "@/components/plan/playground/PlaygroundPageClient";
import { PlanWithDetails } from "@/lib/calculations/projections/generateProjections";

export default async function PlaygroundPage({
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

  // Ép kiểu thủ công nếu bạn chắc chắn giá trị paymentMethod là đúng
  const planData: PlanWithDetails = {
    ...plan,
    paymentMethod: plan.paymentMethod as "fixed" | "decreasing",
  };

  return <PlaygroundPageClient initialPlan={planData} />;
}
