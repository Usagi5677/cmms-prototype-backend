/*
  Warnings:

  - You are about to drop the column `fixedDate` on the `MachinePeriodicMaintenance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MachinePeriodicMaintenance" DROP COLUMN "fixedDate",
ADD COLUMN     "startDate" TIMESTAMP(3);
