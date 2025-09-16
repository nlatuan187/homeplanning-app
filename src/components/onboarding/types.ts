/**
 * Defines the complete data structure for the entire onboarding flow.
 * We define it upfront to ensure consistency across all sections.
 */
export interface OnboardingPlanState {
  // Section 1: Quick Check
  yearsToPurchase?: number;
  targetHousePriceN0?: number;
  targetHouseType?: 'Chung cư' | 'Nhà mặt đất' | 'Khác';
  targetLocation?: string;
  hasCoApplicant?: boolean;
  initialSavings?: number;
  userMonthlyIncome?: number;
  monthlyLivingExpenses?: number;

  // Section 2: Family Support
  coApplicantMonthlyIncome?: number;
  monthlyOtherIncome?: number;
  hasFamilySupport?: boolean;
  familySupportType?: 'GIFT' | 'LOAN';
  familySupportGiftAmount?: number;
  familySupportGiftTiming?: 'NOW' | 'AT_PURCHASE';
  familySupportLoanAmount?: number;
  familySupportLoanInterest?: number;
  familySupportLoanRepayment?: 'MONTHLY' | 'LUMP_SUM';
  familySupportLoanTerm?: number;

  // Section 3: Spending
  monthlyNonHousingDebt?: number;
  currentAnnualInsurancePremium?: number;
  hasNewChild?: boolean;
  yearToHaveChild?: number;
  monthlyChildExpenses?: number;

  // Section 4: Assumptions
  salaryGrowthRate?: number;
  propertyGrowthRate?: number;
  investmentReturnRate?: number;
}

/**
 * Defines the structure for the result returned by the projection calculation.
 */
export type ProjectionResult = {
  success: boolean;
  earliestPurchaseYear?: number;
  isAffordable?: boolean;
  // Keep track of the year user selected in Quick Check to render headings correctly
  selectedPurchaseYear?: number;
  // The projection row year used for affordability decision (usually equals selectedPurchaseYear)
  purchaseProjectionYear?: number;
  // The first affordable year at or after selected year (commonly selected+1 if not affordable)
  nextAffordableYear?: number;
  error?: string;
};

/**
 * Defines the structure for a single question in the multi-step form.
 */
export type QuestionOption = {
  label: string;
  value: string | number | boolean;
};

export type Question = {
  key: keyof OnboardingPlanState;
  text: string;
  type: 'number' | 'options' | 'boolean';
  unit?: string;
  options?: QuestionOption[];
  // A function to determine if this question should be displayed based on previous answers
  condition?: (answers: Partial<OnboardingPlanState>) => boolean;
};
