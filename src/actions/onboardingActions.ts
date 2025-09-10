"use server";

import { PrismaClient } from "@prisma/client";
import { Plan, PlanFamilySupport, OnboardingProgress, OnboardingSectionState } from "@prisma/client";

const prisma = new PrismaClient();

// Type for combined plan data needed for calculations
type PlanDataForOnboarding = Plan & {
  familySupport: PlanFamilySupport | null;
};

/**
 * Calculates the progress for the "Family Support" section.
 * @param plan The plan data including family support.
 * @returns Progress percentage from 0 to 100.
 */
const _calculateFamilySupportProgress = (plan: PlanDataForOnboarding): number => {
  let points = 0;
  const support = plan.familySupport;

  // 1. User's own income (30 points)
  if (plan.userMonthlyIncome > 0) {
    points += 30;
  }

  // If the user hasn't reached the family support page yet, return early.
  if (!support) {
    return points;
  }

  // 2. Co-applicant section (30 points total)
  // Assumes 'false' is an explicit user choice that completes this sub-section.
  if (support.hasCoApplicant === false) {
    points += 30;
  } else if (support.hasCoApplicant === true) {
    points += 10; // For answering 'yes'
    if (support.coApplicantMonthlyIncome && support.coApplicantMonthlyIncome > 0) {
      points += 20; // For providing the income amount
    }
  }

  // 3. Family support section (40 points total)
  // Assumes 'false' is an explicit user choice that completes this sub-section.
  if (support.hasFamilySupport === false) {
    points += 40;
  } else if (support.hasFamilySupport === true) {
    points += 10; // For answering 'yes'
    if (support.familySupportAmount && support.familySupportAmount > 0) {
      points += 30; // For providing the support amount and details
    }
  }

  return Math.min(100, points);
};


/**
 * Calculates the progress for the "Spending" section.
 * NOTE: This logic has a limitation: It assumes any value > 0 means the user has filled it.
 * It cannot reliably track if a user has intentionally set a value to 0.
 * @param plan The plan data.
 * @returns Progress percentage from 0 to 100.
 */
const _calculateSpendingProgress = (plan: PlanDataForOnboarding): number => {
    let percent = 0;
    if (plan.monthlyLivingExpenses > 0) percent += 25;
    if (plan.monthlyNonHousingDebt > 0) percent += 25;
    if (plan.currentAnnualInsurancePremium > 0) percent += 25;
    if (plan.currentAnnualOtherExpenses > 0) percent += 25;
    return percent;
};

/**
 * Calculates the progress for the "Assumptions" section.
 * NOTE: This logic checks if the user has changed values from their initial defaults.
 * This might not count a user who agrees with the default values.
 * @param plan The plan data.
 * @returns Progress percentage from 0 to 100.
 */
const _calculateAssumptionProgress = (plan: PlanDataForOnboarding): number => {
    let percent = 0;
    if (plan.initialSavings > 0) percent += 20; // Default is 0
    if (plan.pctSalaryGrowth !== 7.0) percent += 20; // Default is 7.0
    if (plan.pctHouseGrowth !== 10.0) percent += 20; // Default is 10.0
    if (plan.pctExpenseGrowth !== 4.0) percent += 20; // Default is 4.0
    if (plan.pctInvestmentReturn !== 9.0) percent += 20; // Default is 9.0
    return percent;
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
}


// --- EXPORTED ACTIONS ---

/**
 * Creates an initial onboarding progress record for a new plan.
 * This should be called right after a new plan is created.
 * @param planId The ID of the newly created plan.
 */
export async function createOnboardingProgress(planId: string) {
  try {
    const existingProgress = await prisma.onboardingProgress.findUnique({
      where: { planId },
    });

    if (existingProgress) {
      console.log(`Onboarding progress for plan ${planId} already exists.`);
      return existingProgress;
    }

    const newProgress = await prisma.onboardingProgress.create({
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
 * Recalculates and updates the entire onboarding progress for a given plan.
 * This should be called after any significant update to the plan's data.
 * @param planId The ID of the plan to update.
 */
export async function updateOnboardingProgress(planId: string): Promise<OnboardingProgress | null> {
    try {
        const plan = await prisma.plan.findUnique({
            where: { id: planId },
            include: {
                familySupport: true,
            },
        });

        if (!plan) {
            throw new Error(`Plan with ID ${planId} not found.`);
        }

        const familySupportPercent = _calculateFamilySupportProgress(plan);
        const spendingPercent = _calculateSpendingProgress(plan);
        const assumptionPercent = _calculateAssumptionProgress(plan);
        
        const updatedProgress = await prisma.onboardingProgress.update({
            where: { planId: planId },
            data: {
                familySupportPercent,
                spendingPercent,
                assumptionPercent,
                familySupportState: _getSectionState(familySupportPercent),
                spendingState: _getSectionState(spendingPercent),
                assumptionState: _getSectionState(assumptionPercent),
            }
        });

        console.log(`Updated onboarding progress for plan ${planId}.`);
        return updatedProgress;

    } catch(error) {
        console.error(`Failed to update onboarding progress for plan ${planId}:`, error);
        return null;
    }
}


/**
 * Retrieves the onboarding progress for a specific plan.
 * @param planId The ID of the plan.
 * @returns The onboarding progress object or null if not found.
 */
export async function getOnboardingProgress(planId: string): Promise<OnboardingProgress | null> {
  try {
    const progress = await prisma.onboardingProgress.findUnique({
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
