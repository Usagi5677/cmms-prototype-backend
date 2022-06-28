/*
  Warnings:

  - You are about to drop the column `currentMileage` on the `TransportationHistory` table. All the data in the column will be lost.
  - You are about to drop the column `interServiceMileage` on the `TransportationHistory` table. All the data in the column will be lost.
  - You are about to drop the column `lastServiceMileage` on the `TransportationHistory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TransportationHistory" DROP COLUMN "currentMileage",
DROP COLUMN "interServiceMileage",
DROP COLUMN "lastServiceMileage",
ADD COLUMN     "breakdownHour" INTEGER,
ADD COLUMN     "idleHour" INTEGER,
ADD COLUMN     "workingHour" INTEGER;
