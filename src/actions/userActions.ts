"use server";

import { db } from "@/lib/db";

/**
 * Checks if a user has an existing plan in the database.
 * @param userId - The ID of the user to check.
 * @returns A boolean indicating whether a plan exists for the user.
 */
export async function checkUserHasPlan(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const existingPlan = await db.plan.findFirst({
    where: { userId: userId },
    select: { id: true },
  });

  return !!existingPlan;
}
