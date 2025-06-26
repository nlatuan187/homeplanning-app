/*
  Warnings:

  - You are about to drop the column `familyGiftTiming` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `familyLoanInterestRate` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `familyLoanRepaymentType` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `familyLoanTermYears` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `familySupportType` on the `Plan` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "FamilySupportType" AS ENUM ('GIFT', 'LOAN');

-- CreateEnum
CREATE TYPE "FamilyGiftTiming" AS ENUM ('NOW', 'AT_PURCHASE');

-- CreateEnum
CREATE TYPE "FamilyLoanRepaymentType" AS ENUM ('MONTHLY', 'LUMP_SUM');

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "familyGiftTiming",
DROP COLUMN "familyLoanInterestRate",
DROP COLUMN "familyLoanRepaymentType",
DROP COLUMN "familyLoanTermYears",
DROP COLUMN "familySupportType",
ALTER COLUMN "loanInterestRate" DROP NOT NULL,
ALTER COLUMN "loanTermYears" DROP NOT NULL;

-- CreateTable
CREATE TABLE "FamilySupport" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "hasFamilySupport" BOOLEAN NOT NULL DEFAULT false,
    "familySupportType" "FamilySupportType",
    "familySupportAmount" DOUBLE PRECISION,
    "familyGiftTiming" "FamilyGiftTiming",
    "familyLoanRepaymentType" "FamilyLoanRepaymentType",
    "familyLoanInterestRate" DOUBLE PRECISION,

    CONSTRAINT "FamilySupport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilySupport_planId_key" ON "FamilySupport"("planId");

-- AddForeignKey
ALTER TABLE "FamilySupport" ADD CONSTRAINT "FamilySupport_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
