-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "yearsToPurchase" INTEGER NOT NULL,
    "targetHousePriceN0" DOUBLE PRECISION NOT NULL,
    "targetHouseType" TEXT,
    "targetLocation" TEXT,
    "maritalStatus" TEXT NOT NULL,
    "hasDependents" BOOLEAN NOT NULL,
    "numberOfDependents" INTEGER,
    "plansMarriageBeforeTarget" BOOLEAN,
    "targetMarriageYear" INTEGER,
    "plansChildBeforeTarget" BOOLEAN,
    "targetChildYear" INTEGER,
    "initialSavingsGoal" DOUBLE PRECISION NOT NULL,
    "incomeLastYear" DOUBLE PRECISION NOT NULL,
    "monthlyOtherIncome" DOUBLE PRECISION NOT NULL,
    "monthlyLivingExpenses" DOUBLE PRECISION NOT NULL,
    "monthlyNonHousingDebt" DOUBLE PRECISION NOT NULL,
    "currentAnnualInsurancePremium" DOUBLE PRECISION NOT NULL,
    "spouseMonthlyIncome" DOUBLE PRECISION,
    "pctHouseGrowth" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "pctSalaryGrowth" DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    "pctExpenseGrowth" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "pctInvestmentReturn" DOUBLE PRECISION NOT NULL DEFAULT 11.0,
    "factorMarriage" DOUBLE PRECISION NOT NULL DEFAULT 60.0,
    "factorChild" DOUBLE PRECISION NOT NULL DEFAULT 40.0,
    "loanInterestRate" DOUBLE PRECISION NOT NULL DEFAULT 11.0,
    "loanTermMonths" INTEGER NOT NULL DEFAULT 300,
    "affordabilityOutcome" TEXT,
    "firstViableYear" INTEGER,
    "confirmedPurchaseYear" INTEGER,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
