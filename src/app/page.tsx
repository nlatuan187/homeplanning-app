import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import HomeClient from "@/components/onboarding/HomeClient";
import { Suspense } from "react";

export default async function Home() {
  const user = await currentUser();

  if (user) {
    // Server-side check for existing plan
    // This eliminates the client-side waterfall and loading spinner for returning users
    const existingPlan = await db.plan.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (existingPlan) {
      redirect("/dashboard");
    }
  }

  // If no user or no plan, render the client component
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <HomeClient />
    </Suspense>
  );
}
