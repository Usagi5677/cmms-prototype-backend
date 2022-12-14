/*
  Warnings:

  - You are about to drop the column `lastServiceUpdatedAt` on the `Entity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "lastServiceUpdatedAt",
ADD COLUMN     "lastServiceUpdate" TIMESTAMP(3);
