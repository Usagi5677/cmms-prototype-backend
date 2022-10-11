/*
  Warnings:

  - You are about to drop the column `removedAt` on the `ChecklistTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `removedById` on the `ChecklistTemplate` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChecklistTemplate" DROP CONSTRAINT "ChecklistTemplate_removedById_fkey";

-- AlterTable
ALTER TABLE "ChecklistTemplate" DROP COLUMN "removedAt",
DROP COLUMN "removedById";
