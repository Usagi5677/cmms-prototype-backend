/*
  Warnings:

  - You are about to drop the column `zoneId` on the `UserAssignment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserAssignment" DROP CONSTRAINT "UserAssignment_zoneId_fkey";

-- AlterTable
ALTER TABLE "UserAssignment" DROP COLUMN "zoneId";
