"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { revalidatePath } from "next/cache";

// Define a type for the data we expect from the Family Support form
type FamilySupportData = Pick<
  OnboardingPlanState,
  | 'hasFinancialPartner'
  | 'otherMonthlyIncome'
  | 'hasFamilySupport'
  | 'familySupportType'
  | 'familySupportGiftAmount'
  | 'familySupportGiftTiming'
  | 'familySupportLoanAmount'
  | 'familySupportLoanInterest'
  | 'familySupportLoanRepayment'
  | 'familySupportLoanTerm'
>;

/**
 * Updates the FamilySupport record associated with a specific plan.
 *
 * @param planId - The ID of the plan to update.
 * @param formData - The family support data collected from the form.
 * @returns An object indicating success or failure.
 */
export async function updateFamilySupport(
  planId: string,
  formData: FamilySupportData
) {
  const user = await currentUser();

  if (!user || !user.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // First, verify that the plan belongs to the current user
    const plan = await db.plan.findUnique({
      where: { id: planId, userId: user.id },
      select: { id: true }, // We only need to confirm existence
    });

    if (!plan) {
      return { success: false, error: "Plan not found or access denied." };
    }

    // Prepare data for upsert (update or create)
    // We use an upsert operation in case the familySupport record doesn't exist yet.
    await db.familySupport.upsert({
      where: { planId: planId },
      update: {
        ...formData,
      },
      create: {
        planId: planId,
        ...formData,
      },
    });

    // Revalidate the path to ensure data is fresh on the client side
    revalidatePath(`/plan/${planId}`);

    return { success: true, message: "Family support information updated successfully." };
  } catch (error) {
    console.error("[UPDATE_FAMILY_SUPPORT_ACTION]", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
