"use server";

import { OnboardingSectionState, Plan, PlanFamilySupport } from "@prisma/client";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// A flexible type for configuration entries, allowing weight to be a function.
type ConfigEntry = {
  weight: number | ((formData: Record<string, any>) => number);
};

// Defines the fields and their contribution to progress for the Family Support section.
const FAMILY_SUPPORT_CONFIG: Record<
  | "monthlyOtherIncome"
  | "hasCoApplicant"
  | "coApplicantMonthlyIncome"
  | "hasFamilySupport"
  | "familySupportType"
  | "familySupportAmount"
  | "familyGiftTiming"
  | "familyLoanInterestRate"
  | "familyLoanRepaymentType"
  | "familyLoanTermYears",
  ConfigEntry
> = {
  // Group 1: Co-applicant (40 points)
  hasCoApplicant: {
    weight: (formData) => (formData.hasCoApplicant === false ? 40 : 20),
  },
  coApplicantMonthlyIncome: {
    weight: (formData) => (formData.hasCoApplicant === true ? 20 : 0),
  },
  // Group 2: Other Income (20 points)
  monthlyOtherIncome: { weight: 20 },
  // Group 3: Family Support (40 points)
  hasFamilySupport: {
    weight: (formData) => (formData.hasFamilySupport === false ? 40 : 10),
  },
  familySupportType: {
    weight: (formData) => (formData.hasFamilySupport === true ? 10 : 0),
  },
  familySupportAmount: {
    weight: (formData) => (formData.hasFamilySupport === true ? 10 : 0),
  },
  // Gift Path (10 points)
  familyGiftTiming: {
    weight: (formData) =>
      formData.hasFamilySupport === true && formData.familySupportType === "GIFT"
        ? 10
        : 0,
  },
  // Loan Path (10 points total)
  familyLoanInterestRate: {
    weight: (formData) =>
      formData.hasFamilySupport === true && formData.familySupportType === "LOAN"
        ? 4
        : 0,
  },
  familyLoanRepaymentType: {
    weight: (formData) =>
      formData.hasFamilySupport === true && formData.familySupportType === "LOAN"
        ? 3
        : 0,
  },
  familyLoanTermYears: {
    weight: (formData) =>
      formData.hasFamilySupport === true && formData.familySupportType === "LOAN"
        ? 3
        : 0,
  },
};

// Defines the fields and their contribution to progress for the Spending section.
const SPENDING_CONFIG: Record<
  "monthlyNonHousingDebt" | "currentAnnualInsurancePremium" | "currentAnnualOtherExpenses",
  ConfigEntry
> = {
  monthlyNonHousingDebt: { weight: 33 },
  currentAnnualInsurancePremium: { weight: 33 },
  currentAnnualOtherExpenses: { weight: 33 },
};

// Defines the fields and their contribution to progress for the Assumption section.
const ASSUMPTION_CONFIG: Record<
  "pctSalaryGrowth" | "pctHouseGrowth" | "pctInvestmentReturn",
  ConfigEntry
> = {
  pctSalaryGrowth: { weight: 33 },
  pctHouseGrowth: { weight: 33 },
  pctInvestmentReturn: { weight: 33 },
};

const SECTION_CONFIGS = {
  familySupport: FAMILY_SUPPORT_CONFIG,
  spending: SPENDING_CONFIG,
  assumption: ASSUMPTION_CONFIG,
};

/**
 * Calculates progress based on dynamic weights.
 * The total possible weight and achieved weight are calculated on the fly based on the user's answers,
 * correctly handling conditional questions.
 * @param formData The data from the form.
 * @param config The configuration object with weights for each field.
 * @returns The calculated progress percentage.
 */
const _calculateProgress = (
  formData: Record<string, any>,
  config: Record<string, ConfigEntry>,
  touchedFields: Record<string, boolean>
): number => {
  let achievedWeight = 0;

  for (const field in config) {
    // Chỉ tính điểm cho những trường người dùng đã tương tác
    if (touchedFields[field]) {
      const configEntry = config[field];
      const currentWeight = typeof configEntry.weight === 'function'
        ? configEntry.weight(formData)
        : configEntry.weight;
      
      const value = formData[field];
      if (value !== null && value !== undefined) {
        achievedWeight += currentWeight;
      }
    }
  }

  const percentage = achievedWeight;
  return Math.min(99, Math.round(percentage));
};

/**
 * Determines the section state based on its completion percentage.
 * @param percent The completion percentage.
 * @returns The corresponding OnboardingSectionState.
 */
const _getSectionState = (percent: number): OnboardingSectionState => {
  if (percent >= 100) {
    return OnboardingSectionState.COMPLETED;
  }
  if (percent > 0) {
    return OnboardingSectionState.IN_PROGRESS;
  }
  return OnboardingSectionState.NOT_STARTED;
};

/**
 * Marks an onboarding section as fully completed (100%).
 * This is typically called from the result step of a section.
 * @param planId The ID of the plan.
 * @param section The section to mark as complete.
 */
export async function completeOnboardingSection(
  planId: string,
  section: "familySupport" | "spending" | "assumption"
) {
  try {
    const progressUpdatePayload = {
      [`${section}Percent`]: 100,
      [`${section}State`]: OnboardingSectionState.COMPLETED,
    };

    const updatedProgress = await db.onboardingProgress.update({
      where: { planId },
      data: progressUpdatePayload,
    });

    revalidatePath("/dashboard");

    return { success: true, progress: updatedProgress };
  } catch (error) {
    console.error(`Failed to complete section ${section} for plan ${planId}:`, error);
    return { success: false, error: "Could not complete onboarding section." };
  }
}

// --- EXPORTED ACTIONS ---

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
        familySupportState: OnboardingSectionState.NOT_STARTED,
        spendingState: OnboardingSectionState.NOT_STARTED,
        assumptionState: OnboardingSectionState.NOT_STARTED,
        familySupportPercent: 0,
        spendingPercent: 0,
        assumptionPercent: 0,
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
 * Updates a specific section of the onboarding process.
 * It recalculates the progress percentage and updates the corresponding data in the database.
 * Designed to be called via a debounced effect from the client.
 *
 * @param planId The ID of the plan being updated.
 * @param section The section to update ('familySupport', 'spending', or 'assumption').
 * @param formData The current data from the form for that section.
 */
export async function updateOnboardingSectionProgress(
  planId: string,
  section: keyof typeof SECTION_CONFIGS,
  formData: any,
  touchedFields: Record<string, boolean> // Thêm tham số mới
) {
  try {
    const config = SECTION_CONFIGS[section];
    if (!config) {
      throw new Error(`Invalid section: ${section}`);
    }
    
    // 1. Calculate the new progress percentage
    const percent = _calculateProgress(formData, config, touchedFields); // Truyền touchedFields
    const state = _getSectionState(percent);

    // 2. Update the relevant data in the Plan or PlanFamilySupport table
    if (section === "familySupport") {
      await db.planFamilySupport.upsert({
        where: { planId },
        update: formData,
        create: { planId, ...formData },
      });
    } else {
      // For 'spending' and 'assumption', data is on the Plan model itself
      await db.plan.update({
        where: { id: planId },
        data: formData,
      });
    }

    // 3. Update the OnboardingProgress table
    const progressUpdatePayload = {
      [`${section}Percent`]: percent,
      [`${section}State`]: state,
    };

    const updatedProgress = await db.onboardingProgress.update({
      where: { planId },
      data: progressUpdatePayload,
    });

    // Revalidate the dashboard path to show updated progress
    revalidatePath("/dashboard");

    return { success: true, progress: updatedProgress };

  } catch (error) {
    console.error(`Failed to update progress for plan ${planId}, section ${section}:`, error);
    return { success: false, error: "Could not update onboarding progress." };
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
