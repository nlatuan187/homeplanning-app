"use server";

import { db } from "@/lib/db";
import { Plan } from "@prisma/client";

// Extended Plan type (can be defined here or imported if shared)
type ExtendedPlan = Plan & {
  buffer?: number;
  userEmail?: string;
  revisionHistory?: Record<string, unknown>;
};

export async function getPlansForUser(userId: string): Promise<ExtendedPlan[]> {
  if (!userId) return [];
  // Ensure Prisma Client is only used on the server.
  // The "use server" directive at the top of this file ensures this.
  const plans = await db.plan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, planName: true, createdAt: true, yearsToPurchase: true, targetHouseType: true,
      targetLocation: true, targetHousePriceN0: true, affordabilityOutcome: true, buffer: true,
      firstViableYear: true, userId: true, updatedAt: true, maritalStatus: true, hasDependents: true,
      numberOfDependents: true, plansMarriageBeforeTarget: true, targetMarriageYear: true,
      plansChildBeforeTarget: true, targetChildYear: true, initialSavingsGoal: true, incomeLastYear: true,
      monthlyOtherIncome: true, monthlyLivingExpenses: true, monthlyNonHousingDebt: true,
      currentAnnualInsurancePremium: true, spouseMonthlyIncome: true, pctHouseGrowth: true,
      pctSalaryGrowth: true, pctExpenseGrowth: true, pctInvestmentReturn: true, factorMarriage: true,
      factorChild: true, loanInterestRate: true, loanTermMonths: true, confirmedPurchaseYear: true,
      reportGeneratedAt: true, reportAssetEfficiency: true, reportCapitalStructure: true,
      reportSpendingPlan: true, reportInsurance: true, reportBackupPlans: true, revisionCount: true, userEmail: true,
      // revisionHistory is Json?, Prisma select handles it if it exists.
      // Ensure no client-only types are accidentally returned if ExtendedPlan is more complex.
    },
  });
  // Important: Ensure that the data returned is serializable if it's passed from server to client.
  // Prisma's default return types (like Date for createdAt/updatedAt) are generally fine.
  return plans as ExtendedPlan[];
}
