/*
  Warnings:

  - A unique constraint covering the columns `[userId,entityId,type]` on the table `EntityAssignment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "EntityAssignment_userId_entityId_key";

-- AlterTable
ALTER TABLE "EntityAssignment" ADD COLUMN     "type" TEXT NOT NULL DEFAULT E'User';

-- CreateIndex
CREATE UNIQUE INDEX "EntityAssignment_userId_entityId_type_key" ON "EntityAssignment"("userId", "entityId", "type");
