-- CreateTable
CREATE TABLE "MilestoneProgress" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "currentSavings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "selectedMilestoneId" INTEGER NOT NULL DEFAULT 1,
    "totalCompletedMilestones" INTEGER NOT NULL DEFAULT 0,
    "savingsPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "housePriceProjected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "milestoneGroups" JSONB,
    "currentMilestoneData" JSONB,
    "completedMilestones" JSONB,
    "planPageData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastProgressUpdate" TIMESTAMP(3),
    "lastMilestoneCalculation" TIMESTAMP(3),

    CONSTRAINT "MilestoneProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MilestoneProgress_planId_idx" ON "MilestoneProgress"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneProgress_planId_key" ON "MilestoneProgress"("planId");

-- AddForeignKey
ALTER TABLE "MilestoneProgress" ADD CONSTRAINT "MilestoneProgress_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
