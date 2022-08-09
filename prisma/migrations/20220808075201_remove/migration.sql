/*
  Warnings:

  - You are about to drop the column `completedAt` on the `EntityRepair` table. All the data in the column will be lost.
  - You are about to drop the column `completedById` on the `EntityRepair` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "EntityRepair" DROP CONSTRAINT "EntityRepair_completedById_fkey";

-- AlterTable
ALTER TABLE "EntityRepair" DROP COLUMN "completedAt",
DROP COLUMN "completedById";
