/*
  Warnings:

  - You are about to drop the column `lastServiceUpdate` on the `Entity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "lastServiceUpdate",
ADD COLUMN     "serviceUpdate" TIMESTAMP(3);
