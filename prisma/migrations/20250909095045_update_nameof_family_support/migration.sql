/*
  Warnings:

  - You are about to drop the `FamilySupport` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FamilySupport" DROP CONSTRAINT "FamilySupport_planId_fkey";

-- DropTable
DROP TABLE "FamilySupport";

-- CreateTable
CREATE TABLE "planFamilySupport" (
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

    CONSTRAINT "planFamilySupport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planFamilySupport_planId_key" ON "planFamilySupport"("planId");

-- AddForeignKey
ALTER TABLE "planFamilySupport" ADD CONSTRAINT "planFamilySupport_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
