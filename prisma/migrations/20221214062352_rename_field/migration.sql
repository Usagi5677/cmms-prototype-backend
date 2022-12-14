/*
  Warnings:

  - You are about to drop the column `serviceUpdate` on the `Entity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "serviceUpdate",
ADD COLUMN     "lastServiceUpdateAt" TIMESTAMP(3);
