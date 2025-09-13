import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import QuickCheckClient from "@/app/plan/[planId]/quickcheck/QuickCheckClient";

export default async function OnboardingPage({
    params,
  }: {
    params: { planId: string };
  }) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Lấy dữ liệu plan gốc
  const plan = await db.plan.findFirst({
    where: { userId: user.id },
  });

  if (!plan) {
    redirect("/dashboard");
  }
   
  return (
    <QuickCheckClient plan={plan}/>
  );
} 