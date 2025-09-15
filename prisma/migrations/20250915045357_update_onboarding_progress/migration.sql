/*
  Warnings:

  - You are about to drop the column `currentAnnualOtherExpenses` on the `Plan` table. All the data in the column will be lost.
  - Added the required column `monthlyChildExpenses` to the `Plan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "currentAnnualOtherExpenses",
ADD COLUMN     "monthlyChildExpenses" DOUBLE PRECISION NOT NULL;
