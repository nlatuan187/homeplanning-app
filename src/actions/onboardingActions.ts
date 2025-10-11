"use server";

import { OnboardingSectionState } from "@prisma/client";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Creates an initial onboarding progress record for a new plan.
 * This should be called right after a new plan is created.
 * @param planId The ID of the newly created plan.
 */
export async function createOnboardingProgress(planId: string) {
  try {
    const existingProgress = await db.onboardingProgress.findUnique({
      where: { planId },
    });

    if (existingProgress) {
      console.log(`Onboarding progress for plan ${planId} already exists.`);
      return existingProgress;
    }

    const newProgress = await db.onboardingProgress.create({
      data: {
        planId: planId,
        quickCheckState: OnboardingSectionState.COMPLETED,
        familySupportState: OnboardingSectionState.NOT_STARTED,
        spendingState: OnboardingSectionState.NOT_STARTED,
        assumptionState: OnboardingSectionState.NOT_STARTED,
      },
    });
    console.log(`Created onboarding progress for plan ${planId}.`);
    return newProgress;
  } catch (error) {
    console.error("Error creating onboarding progress:", error);
    throw new Error("Could not create onboarding progress.");
  }
}

/**
 * Retrieves the onboarding progress for a specific plan.
 * @param planId The ID of the plan.
 * @returns The onboarding progress object or null if not found.
 */
export async function getOnboardingProgress(planId: string) {
  try {
    const progress = await db.onboardingProgress.findUnique({
      where: {
        planId: planId,
      },
    });
    return progress;
  } catch (error) {
    console.error("Error fetching onboarding progress:", error);
    return null;
  }
}

export async function updateOnboardingSectionProgress(
  planId: string, 
  section: "familySupport" | "spending" | "assumption" | "quickCheck",
  state: OnboardingSectionState,
) {
  try {
    const updatedProgress = await db.onboardingProgress.update({
      where: { planId },
      data: {
        [`${section}State`]: state,
      },
    });

    revalidatePath("/dashboard");

    return { success: true, progress: updatedProgress };
  } catch (error) {
    console.error(`Failed to complete section ${section} for plan ${planId}:`, error);
    return { success: false, error: "Could not complete onboarding section." };
  }
}

export async function saveContact(phone: string, userId: string) {
  try {
    const contact = await db.user.update({
      where: { id: userId },
      data: { phone },
    });
    return contact;
  } catch (error) {
    console.error("Error saving contact:", error);
    throw new Error("Could not save contact.");
  }
}

export async function getUser(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
    });
    return user;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export async function getPlan(planId: string) {
  try {
    const plan = await db.plan.findUnique({
      where: { id: planId },
    });
    return plan;
  } catch (error) {
    console.error("Error fetching plan:", error);
    return null;
  }
}

export async function updatePlanViableYear(planId: string, firstViableYear: number | undefined) {
  try {
    const updatedPlan = await db.plan.update({
      where: { id: planId },
      data: { firstViableYear },
    });
    return { success: true, plan: updatedPlan };
  } catch (error) {
    console.error(`Lỗi khi cập nhật năm khả thi cho plan ${planId}:`, error);
    return { success: false, error: "Không thể cập nhật kế hoạch." };
  }
}