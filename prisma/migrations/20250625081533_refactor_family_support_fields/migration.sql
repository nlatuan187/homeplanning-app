/*
  Warnings:

  - You are about to drop the column `familySupportLoanInterestRate` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `familySupportLoanTermYears` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `familySupportRepaymentType` on the `Plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "familySupportLoanInterestRate",
DROP COLUMN "familySupportLoanTermYears",
DROP COLUMN "familySupportRepaymentType",
ADD COLUMN     "familyGiftTiming" TEXT,
ADD COLUMN     "familyLoanInterestRate" DOUBLE PRECISION,
ADD COLUMN     "familyLoanRepaymentType" TEXT,
ADD COLUMN     "familyLoanTermYears" INTEGER,
ADD COLUMN     "familySupportType" TEXT;
