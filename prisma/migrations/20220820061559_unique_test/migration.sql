/*
  Warnings:

  - A unique constraint covering the columns `[entityId,from,to,measurement,copy,template]` on the table `PeriodicMaintenance` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PeriodicMaintenance_entityId_from_to_measurement_copy_key";

-- CreateIndex
CREATE UNIQUE INDEX "PeriodicMaintenance_entityId_from_to_measurement_copy_templ_key" ON "PeriodicMaintenance"("entityId", "from", "to", "measurement", "copy", "template");
