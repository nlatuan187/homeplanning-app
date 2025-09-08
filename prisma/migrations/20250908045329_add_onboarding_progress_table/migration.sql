-- CreateEnum
CREATE TYPE "OnboardingSectionState" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "familySupportState" "OnboardingSectionState" NOT NULL DEFAULT 'NOT_STARTED',
    "spendingState" "OnboardingSectionState" NOT NULL DEFAULT 'NOT_STARTED',
    "assumptionState" "OnboardingSectionState" NOT NULL DEFAULT 'NOT_STARTED',
    "familySupportPercent" INTEGER NOT NULL DEFAULT 0,
    "spendingPercent" INTEGER NOT NULL DEFAULT 0,
    "assumptionPercent" INTEGER NOT NULL DEFAULT 0,
    "draftData" JSONB,
    "lastSection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_planId_key" ON "OnboardingProgress"("planId");

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
