/*
  Warnings:

  - You are about to drop the `planFamilySupport` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "planFamilySupport" DROP CONSTRAINT "planFamilySupport_planId_fkey";

-- DropTable
DROP TABLE "planFamilySupport";

-- CreateTable
CREATE TABLE "PlanFamilySupport" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "monthlyOtherIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasCoApplicant" BOOLEAN NOT NULL DEFAULT false,
    "coApplicantMonthlyIncome" DOUBLE PRECISION,
    "hasFamilySupport" BOOLEAN NOT NULL DEFAULT false,
    "familySupportType" "FamilySupportType",
    "familySupportAmount" DOUBLE PRECISION,
    "familyGiftTiming" "FamilyGiftTiming",
    "familyLoanRepaymentType" "FamilyLoanRepaymentType",
    "familyLoanInterestRate" DOUBLE PRECISION,
    "familyLoanTermYears" INTEGER,

    CONSTRAINT "PlanFamilySupport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanFamilySupport_planId_key" ON "PlanFamilySupport"("planId");

-- AddForeignKey
ALTER TABLE "PlanFamilySupport" ADD CONSTRAINT "PlanFamilySupport_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
