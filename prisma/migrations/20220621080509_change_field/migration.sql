/*
  Warnings:

  - You are about to drop the column `currentRunningHrs` on the `MachineHistory` table. All the data in the column will be lost.
  - You are about to drop the column `interServiceHrs` on the `MachineHistory` table. All the data in the column will be lost.
  - You are about to drop the column `lastServiceHrs` on the `MachineHistory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MachineHistory" DROP COLUMN "currentRunningHrs",
DROP COLUMN "interServiceHrs",
DROP COLUMN "lastServiceHrs",
ADD COLUMN     "currentRunning" INTEGER,
ADD COLUMN     "interService" INTEGER,
ADD COLUMN     "lastService" INTEGER;
