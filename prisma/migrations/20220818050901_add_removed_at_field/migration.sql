-- DropIndex
DROP INDEX "EntityAssignment_userId_entityId_type_key";

-- AlterTable
ALTER TABLE "EntityAssignment" ADD COLUMN     "removedAt" TIMESTAMP(3);
