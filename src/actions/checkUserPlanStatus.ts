"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Checks if the current user has an existing plan.
 * @returns An object containing `hasPlan` (boolean) and `planId` (string | null).
 */
export async function checkUserPlanStatus() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("Unauthorized");
  }

  const existingPlan = await db.plan.findFirst({
    where: { userId: clerkUser.id },
    select: { id: true }, // Only select the ID for performance
  });

  if (existingPlan) {
    return { hasPlan: true, planId: existingPlan.id };
  }

  return { hasPlan: false, planId: null };
} 