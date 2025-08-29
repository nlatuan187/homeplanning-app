/*
  Warnings:

  - You are about to drop the column `completedMilestones` on the `MilestoneProgress` table. All the data in the column will be lost.
  - You are about to drop the column `currentMilestoneData` on the `MilestoneProgress` table. All the data in the column will be lost.
  - You are about to drop the column `milestoneGroups` on the `MilestoneProgress` table. All the data in the column will be lost.
  - You are about to drop the column `planPageData` on the `MilestoneProgress` table. All the data in the column will be lost.
  - You are about to drop the column `playgroundInteractionLog` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `reportAssetEfficiency` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `reportBackupPlans` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `reportCapitalStructure` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `reportGeneratedAt` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `reportInsurance` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `reportSpendingPlan` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `revisionCount` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `revisionHistory` on the `Plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MilestoneProgress" DROP COLUMN "completedMilestones",
DROP COLUMN "currentMilestoneData",
DROP COLUMN "milestoneGroups",
DROP COLUMN "planPageData";

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "playgroundInteractionLog",
DROP COLUMN "reportAssetEfficiency",
DROP COLUMN "reportBackupPlans",
DROP COLUMN "reportCapitalStructure",
DROP COLUMN "reportGeneratedAt",
DROP COLUMN "reportInsurance",
DROP COLUMN "reportSpendingPlan",
DROP COLUMN "revisionCount",
DROP COLUMN "revisionHistory";

-- CreateTable
CREATE TABLE "PlanReport" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "assetEfficiency" TEXT,
    "capitalStructure" TEXT,
    "spendingPlan" TEXT,
    "insurance" TEXT,
    "backupPlans" TEXT,

    CONSTRAINT "PlanReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanHistory" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "revisionHistory" JSONB,
    "interactionLog" JSONB,

    CONSTRAINT "PlanHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanRoadmap" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "milestoneGroups" JSONB,
    "currentMilestoneData" JSONB,
    "completedMilestones" JSONB,
    "planPageData" JSONB,

    CONSTRAINT "PlanRoadmap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanReport_planId_key" ON "PlanReport"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanHistory_planId_key" ON "PlanHistory"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanRoadmap_planId_key" ON "PlanRoadmap"("planId");

-- AddForeignKey
ALTER TABLE "PlanReport" ADD CONSTRAINT "PlanReport_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanHistory" ADD CONSTRAINT "PlanHistory_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanRoadmap" ADD CONSTRAINT "PlanRoadmap_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
