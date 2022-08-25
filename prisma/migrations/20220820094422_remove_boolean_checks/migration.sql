/*
  Warnings:

  - You are about to drop the column `copy` on the `PeriodicMaintenance` table. All the data in the column will be lost.
  - You are about to drop the column `template` on the `PeriodicMaintenance` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[entityId,from,to,measurement,type]` on the table `PeriodicMaintenance` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PeriodicMaintenance_entityId_from_to_measurement_copy_templ_key";

-- AlterTable
ALTER TABLE "PeriodicMaintenance" DROP COLUMN "copy",
DROP COLUMN "template",
ADD COLUMN     "type" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PeriodicMaintenance_entityId_from_to_measurement_type_key" ON "PeriodicMaintenance"("entityId", "from", "to", "measurement", "type");
