import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import FamilySupportClient from "./FamilySupportClient";

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
    include: { familySupport: true },
  });

  if (!plan) {
    redirect("/dashboard");
  }
   
  return (
    <FamilySupportClient planId={plan.id}/>
  );
} 