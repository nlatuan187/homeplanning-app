/*
  Warnings:

  - You are about to drop the column `factorChild` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `factorMarriage` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `hasDependents` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `incomeLastYear` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `initialSavingsGoal` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `loanTermMonths` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `maritalStatus` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfDependents` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `plansChildBeforeTarget` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `plansMarriageBeforeTarget` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `spouseMonthlyIncome` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `targetChildYear` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `targetMarriageYear` on the `Plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "factorChild",
DROP COLUMN "factorMarriage",
DROP COLUMN "hasDependents",
DROP COLUMN "incomeLastYear",
DROP COLUMN "initialSavingsGoal",
DROP COLUMN "loanTermMonths",
DROP COLUMN "maritalStatus",
DROP COLUMN "numberOfDependents",
DROP COLUMN "paymentMethod",
DROP COLUMN "plansChildBeforeTarget",
DROP COLUMN "plansMarriageBeforeTarget",
DROP COLUMN "spouseMonthlyIncome",
DROP COLUMN "targetChildYear",
DROP COLUMN "targetMarriageYear",
ADD COLUMN     "coApplicantMonthlyIncome" DOUBLE PRECISION,
ADD COLUMN     "coApplicantSalaryGrowth" DOUBLE PRECISION,
ADD COLUMN     "familySupportAmount" DOUBLE PRECISION,
ADD COLUMN     "familySupportLoanInterestRate" DOUBLE PRECISION,
ADD COLUMN     "familySupportLoanTermYears" INTEGER,
ADD COLUMN     "familySupportRepaymentType" TEXT,
ADD COLUMN     "hasCoApplicant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasFamilySupport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "initialSavings" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "loanTermYears" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "userMonthlyIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "yearsToPurchase" SET DEFAULT 3,
ALTER COLUMN "monthlyOtherIncome" SET DEFAULT 0,
ALTER COLUMN "monthlyNonHousingDebt" SET DEFAULT 0,
ALTER COLUMN "currentAnnualInsurancePremium" SET DEFAULT 0,
ALTER COLUMN "pctInvestmentReturn" SET DEFAULT 9.0;
