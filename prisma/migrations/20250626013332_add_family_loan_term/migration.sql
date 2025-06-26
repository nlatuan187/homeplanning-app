/*
  Warnings:

  - You are about to drop the column `familySupportAmount` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `hasFamilySupport` on the `Plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FamilySupport" ADD COLUMN     "familyLoanTermYears" INTEGER;

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "familySupportAmount",
DROP COLUMN "hasFamilySupport";
