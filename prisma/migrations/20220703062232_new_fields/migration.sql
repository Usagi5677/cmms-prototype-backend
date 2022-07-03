-- AlterTable
ALTER TABLE "Machine" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN;
