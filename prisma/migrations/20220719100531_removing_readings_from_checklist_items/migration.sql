/*
  Warnings:

  - You are about to drop the column `currentMeterReading` on the `ChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `workingHour` on the `ChecklistItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChecklistItem" DROP COLUMN "currentMeterReading",
DROP COLUMN "workingHour";
