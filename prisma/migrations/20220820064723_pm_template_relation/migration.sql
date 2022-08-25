-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "periodicMaintenanceId" INTEGER;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_periodicMaintenanceId_fkey" FOREIGN KEY ("periodicMaintenanceId") REFERENCES "PeriodicMaintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
