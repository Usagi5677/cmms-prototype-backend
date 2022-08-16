/*
  Warnings:

  - You are about to drop the column `currentMileage` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the column `lastServiceMileage` on the `Entity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "currentMileage",
DROP COLUMN "lastServiceMileage";
