/*
  Warnings:

  - You are about to drop the column `locationId` on the `EntityRepairRequest` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "EntityRepairRequest" DROP CONSTRAINT "EntityRepairRequest_locationId_fkey";

-- AlterTable
ALTER TABLE "EntityRepairRequest" DROP COLUMN "locationId",
ADD COLUMN     "location" TEXT;
