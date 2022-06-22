/*
  Warnings:

  - You are about to drop the column `amount` on the `MachinePeriodicMaintenance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MachinePeriodicMaintenance" DROP COLUMN "amount",
ADD COLUMN     "value" INTEGER;
