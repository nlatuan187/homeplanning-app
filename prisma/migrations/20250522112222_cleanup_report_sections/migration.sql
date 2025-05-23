/*
  Warnings:

  - You are about to drop the column `reportFuturePlanning` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `reportRiskManagement` on the `Plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "reportFuturePlanning",
DROP COLUMN "reportRiskManagement",
ADD COLUMN     "paymentMethod" TEXT DEFAULT 'fixed';
