/**
 * Defines the complete data structure for the entire onboarding flow.
 * We define it upfront to ensure consistency across all sections.
 */
export interface OnboardingPlanState {
  // Section 1: Quick Check
  purchaseYear?: number;
  propertyValue?: number;
  propertyType?: 'APARTMENT' | 'LANDED_HOUSE' | 'OTHER';
  city?: string;
  initialSavings?: number;
  personalMonthlyIncome?: number;
  personalMonthlyExpenses?: number;

  // Section 2: Family Support
  hasFinancialPartner?: boolean;
  partnerMonthlyIncome?: number;
  otherMonthlyIncome?: number;
  hasFamilySupport?: boolean;
  familySupportType?: 'GIFT' | 'LOAN';
  familySupportGiftAmount?: number;
  familySupportGiftTiming?: 'NOW' | 'AT_PURCHASE';
  familySupportLoanAmount?: number;
  familySupportLoanInterest?: number;
  familySupportLoanRepayment?: 'MONTHLY' | 'LUMPSUM';
  familySupportLoanTerm?: number;

  // Section 3: Spending
  monthlyLoanRepayments?: number;
  annualInsuranceCosts?: number;
  hasDependents?: boolean;
  monthlyDependentCosts?: number;
  hasNewChildPlan?: boolean;
  newChildYear?: number;

  // Section 4: Assumptions
  salaryGrowthRate?: number;
  propertyGrowthRate?: number; // Fixed at 10%
  investmentReturnRate?: number;
}

/**
 * Defines the structure for the result returned by the projection calculation.
 */
export type ProjectionResult = {
  success: boolean;
  message: string;
  earliestPurchaseYear?: number;
  isAffordable?: boolean;
  error?: string;
};
