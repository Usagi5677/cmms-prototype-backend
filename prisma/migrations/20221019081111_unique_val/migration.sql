/*
  Warnings:

  - A unique constraint covering the columns `[entityId,originId,from,to,measurement,type]` on the table `PeriodicMaintenance` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PeriodicMaintenance_entityId_originId_from_to_measurement_t_key" ON "PeriodicMaintenance"("entityId", "originId", "from", "to", "measurement", "type");
