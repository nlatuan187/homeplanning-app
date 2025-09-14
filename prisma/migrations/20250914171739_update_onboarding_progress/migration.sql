/*
  Warnings:

  - You are about to drop the column `hasCoApplicant` on the `PlanFamilySupport` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "hasCoApplicant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasNewChild" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "yearToHaveChild" INTEGER;

-- AlterTable
ALTER TABLE "PlanFamilySupport" DROP COLUMN "hasCoApplicant";
