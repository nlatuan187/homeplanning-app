-- AlterTable
ALTER TABLE "Plan" ALTER COLUMN "monthlyChildExpenses" DROP NOT NULL,
ALTER COLUMN "monthlyChildExpenses" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PlanFamilySupport" ALTER COLUMN "hasFamilySupport" DROP NOT NULL,
ALTER COLUMN "hasFamilySupport" DROP DEFAULT;
