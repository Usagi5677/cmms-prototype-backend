/*
  Warnings:

  - A unique constraint covering the columns `[id,originId,from,to,copy]` on the table `PeriodicMaintenance` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PeriodicMaintenance_id_from_to_copy_key";

-- CreateIndex
CREATE UNIQUE INDEX "PeriodicMaintenance_id_originId_from_to_copy_key" ON "PeriodicMaintenance"("id", "originId", "from", "to", "copy");
