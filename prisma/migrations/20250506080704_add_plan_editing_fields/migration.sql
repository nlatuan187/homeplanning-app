-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "buffer" DOUBLE PRECISION,
ADD COLUMN     "revisionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "revisionHistory" JSONB,
ADD COLUMN     "userEmail" TEXT;
