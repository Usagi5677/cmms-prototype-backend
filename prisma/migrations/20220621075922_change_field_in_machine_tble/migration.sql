/*
  Warnings:

  - You are about to drop the column `currentRunningHrs` on the `Machine` table. All the data in the column will be lost.
  - You are about to drop the column `interServiceHrs` on the `Machine` table. All the data in the column will be lost.
  - You are about to drop the column `lastServiceHrs` on the `Machine` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Machine" DROP COLUMN "currentRunningHrs",
DROP COLUMN "interServiceHrs",
DROP COLUMN "lastServiceHrs",
ADD COLUMN     "currentRunning" INTEGER,
ADD COLUMN     "interService" INTEGER,
ADD COLUMN     "lastService" INTEGER,
ADD COLUMN     "measurement" TEXT DEFAULT E'km';
