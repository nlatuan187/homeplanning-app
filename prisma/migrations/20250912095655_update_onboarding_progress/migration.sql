/*
  Warnings:

  - You are about to drop the column `assumptionPercent` on the `OnboardingProgress` table. All the data in the column will be lost.
  - You are about to drop the column `familySupportPercent` on the `OnboardingProgress` table. All the data in the column will be lost.
  - You are about to drop the column `spendingPercent` on the `OnboardingProgress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OnboardingProgress" DROP COLUMN "assumptionPercent",
DROP COLUMN "familySupportPercent",
DROP COLUMN "spendingPercent",
ADD COLUMN     "quickCheckState" "OnboardingSectionState" NOT NULL DEFAULT 'NOT_STARTED';
