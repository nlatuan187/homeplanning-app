/*
  Warnings:

  - You are about to drop the column `coApplicantMonthlyIncome` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `hasCoApplicant` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyOtherIncome` on the `Plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FamilySupport" ADD COLUMN     "coApplicantMonthlyIncome" DOUBLE PRECISION,
ADD COLUMN     "hasCoApplicant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monthlyOtherIncome" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "coApplicantMonthlyIncome",
DROP COLUMN "hasCoApplicant",
DROP COLUMN "monthlyOtherIncome";
