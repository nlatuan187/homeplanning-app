import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import PlaygroundPageClient from "@/components/plan/playground/PlaygroundPageClient"; // We will create this next

export default async function PlaygroundPage({
  params,
}: {
  params: { planId: string };
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

  // Pass the fetched data as a prop to the client component
  return <PlaygroundPageClient initialPlan={planData} />;
}