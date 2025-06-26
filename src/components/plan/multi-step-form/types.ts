/**
 * types.ts
 * 
 * Defines the TypeScript types and schemas for the multi-step plan creation form.
 * This ensures type safety and consistency between the form state, validation, and the backend Prisma model.
 */

import { z } from 'zod';
import {
  FamilyGiftTiming,
  FamilyLoanRepaymentType,
  FamilySupportType,
} from '@prisma/client';

/**
 * Zod schema for validating the multi-step plan form.
 * Each page's fields are defined here.
 */
export const planSchema = z.object({
  // Page 1: Goal Inputs
  yearsToPurchase: z.number().min(1, "Phải lớn hơn 0").max(50, "Không thể vượt quá 50 năm"),
  targetHousePriceN0: z.number().min(1, "Phải lớn hơn 0"),
  targetHouseType: z.string().optional(),
  targetLocation: z.string().optional(),
  pctHouseGrowth: z.number().min(0).max(100),

  // Page 2: Income Inputs
  userMonthlyIncome: z.number().min(0, "Không thể là số âm"),
  hasCoApplicant: z.boolean(),
  coApplicantMonthlyIncome: z.number().optional(),
  monthlyOtherIncome: z.number().min(0, "Không thể là số âm"),
  pctSalaryGrowth: z.number().min(0).max(100),
  coApplicantSalaryGrowth: z.number().optional(),

  // Page 3: Spending & Savings Inputs
  monthlyLivingExpenses: z.number().min(0, "Không thể là số âm"),
  monthlyNonHousingDebt: z.number().min(0, "Không thể là số âm"),
  currentAnnualInsurancePremium: z.number().min(0, "Không thể là số âm"),
  initialSavings: z.number().min(0, "Không thể là số âm"),
  pctExpenseGrowth: z.number().min(0).max(100),
  pctInvestmentReturn: z.number().min(0).max(100),

  // Page 4: Loan & Support Inputs
  loanInterestRate: z.number().min(0).max(100),
  loanTermYears: z.number().min(1).max(50),
  paymentMethod: z.enum(['fixed', 'decreasing']),

  familySupport: z.object({
    hasFamilySupport: z.boolean().default(false),
    familySupportType: z.nativeEnum(FamilySupportType).nullable(),
    familySupportAmount: z.number().optional(),
    familyGiftTiming: z.nativeEnum(FamilyGiftTiming).nullable(),
    familyLoanRepaymentType: z.nativeEnum(FamilyLoanRepaymentType).nullable(),
    familyLoanInterestRate: z.number().optional(),
    familyLoanTermYears: z.number().optional(),
  }),
});

/**
 * Represents the type of the form state, inferred from the Zod schema.
 * This is the primary data structure used to manage the state of the multi-step form.
 */
export type PlanFormState = z.infer<typeof planSchema>;

/**
 * Defines the props for each step component in the multi-step form.
 * @template T - A subset of keys from PlanFormState relevant to the current step.
 */
export interface StepProps {
  formState: PlanFormState;
  setFormState: React.Dispatch<React.SetStateAction<PlanFormState>>;
  goToNextStep: () => void;
  goToPrevStep: () => void;
} 