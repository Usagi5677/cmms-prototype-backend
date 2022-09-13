/*
  Warnings:

  - You are about to drop the `EntityBreakdown` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EntityBreakdown" DROP CONSTRAINT "EntityBreakdown_completedById_fkey";

-- DropForeignKey
ALTER TABLE "EntityBreakdown" DROP CONSTRAINT "EntityBreakdown_entityId_fkey";

-- DropTable
DROP TABLE "EntityBreakdown";
