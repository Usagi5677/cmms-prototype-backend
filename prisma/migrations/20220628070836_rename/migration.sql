/*
  Warnings:

  - You are about to drop the column `currentRunning` on the `MachineHistory` table. All the data in the column will be lost.
  - You are about to drop the column `interService` on the `MachineHistory` table. All the data in the column will be lost.
  - You are about to drop the column `lastService` on the `MachineHistory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MachineHistory" DROP COLUMN "currentRunning",
DROP COLUMN "interService",
DROP COLUMN "lastService",
ADD COLUMN     "breakdownHour" INTEGER,
ADD COLUMN     "idleHour" INTEGER,
ADD COLUMN     "workingHour" INTEGER;
