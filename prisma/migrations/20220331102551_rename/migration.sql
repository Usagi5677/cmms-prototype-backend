/*
  Warnings:

  - You are about to drop the column `transportId` on the `TransportationPeriodicMaintenance` table. All the data in the column will be lost.
  - Added the required column `transportationId` to the `TransportationPeriodicMaintenance` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TransportationPeriodicMaintenance" DROP CONSTRAINT "TransportationPeriodicMaintenance_transportId_fkey";

-- AlterTable
ALTER TABLE "TransportationPeriodicMaintenance" DROP COLUMN "transportId",
ADD COLUMN     "transportationId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "TransportationPeriodicMaintenance" ADD CONSTRAINT "TransportationPeriodicMaintenance_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
