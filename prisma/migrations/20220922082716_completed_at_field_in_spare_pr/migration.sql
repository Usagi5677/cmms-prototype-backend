-- AlterTable
ALTER TABLE "SparePR" ADD COLUMN     "completedAt" TIMESTAMP(3),
ALTER COLUMN "requestedDate" DROP NOT NULL;
