-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "reportAssetEfficiency" TEXT,
ADD COLUMN     "reportBackupPlans" TEXT,
ADD COLUMN     "reportCapitalStructure" TEXT,
ADD COLUMN     "reportFuturePlanning" TEXT,
ADD COLUMN     "reportGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "reportInsurance" TEXT,
ADD COLUMN     "reportRiskManagement" TEXT,
ADD COLUMN     "reportSpendingPlan" TEXT;
