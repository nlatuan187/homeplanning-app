import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import LoadingStep from "@/components/onboarding/shared/LoadingStep";

export default async function OnboardingGatewayPage() {
  const user = await currentUser();

  // Although this route is protected by middleware, an explicit check is good practice.
  if (!user) {
    redirect('/sign-in');
  }

  // Check if this user already has a plan in the database.
  const existingPlan = await db.plan.findFirst({
    where: { userId: user.id },
    select: { id: true } // Only need the id to check for existence.
  });

  if (existingPlan) {
    // This is a rare edge case: a user with a plan ended up in the new sign-up flow.
    // Safely redirect them to their dashboard.
    redirect('/dashboard');
  } else {
    // This is a genuine new user. Send them to the homepage to start the onboarding flow.
    // The homepage will now handle the logic for an authenticated user without a plan.
    redirect('/');
  }

  // Display a loading screen while the server-side checks are performed.
  return (
    <div className="flex h-screen items-center justify-center">
      <LoadingStep message="Đang chuẩn bị hành trình của bạn..." percentage={100} />
    </div>
  );
}
