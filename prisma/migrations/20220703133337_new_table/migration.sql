-- CreateTable
CREATE TABLE "TransportationPeriodicMaintenanceTask" (
    "id" SERIAL NOT NULL,
    "periodicMaintenanceId" INTEGER NOT NULL,
    "parentTaskId" INTEGER,
    "name" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TransportationPeriodicMaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TransportationPeriodicMaintenanceTask" ADD CONSTRAINT "TransportationPeriodicMaintenanceTask_periodicMaintenanceI_fkey" FOREIGN KEY ("periodicMaintenanceId") REFERENCES "TransportationPeriodicMaintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationPeriodicMaintenanceTask" ADD CONSTRAINT "TransportationPeriodicMaintenanceTask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationPeriodicMaintenanceTask" ADD CONSTRAINT "TransportationPeriodicMaintenanceTask_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "TransportationPeriodicMaintenanceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
