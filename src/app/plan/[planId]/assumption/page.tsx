import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import AssumptionClient from "./AssumptionClient";

export default async function AssumptionPage({
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

  console.log(plan);

  if (!plan) {
    redirect("/dashboard");
  }
   
  return (
    <AssumptionClient plan={plan}/>
  );
}
