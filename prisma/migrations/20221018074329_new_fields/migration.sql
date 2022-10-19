-- AlterTable
ALTER TABLE "PeriodicMaintenance" ADD COLUMN     "recur" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "status" TEXT;
