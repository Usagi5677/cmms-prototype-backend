-- CreateTable
CREATE TABLE "MachinePeriodicMaintenanceTask" (
    "id" SERIAL NOT NULL,
    "periodicMaintenanceId" INTEGER NOT NULL,
    "parentTaskId" INTEGER,
    "name" TEXT NOT NULL,

    CONSTRAINT "MachinePeriodicMaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MachinePeriodicMaintenanceTask" ADD CONSTRAINT "MachinePeriodicMaintenanceTask_periodicMaintenanceId_fkey" FOREIGN KEY ("periodicMaintenanceId") REFERENCES "MachinePeriodicMaintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachinePeriodicMaintenanceTask" ADD CONSTRAINT "MachinePeriodicMaintenanceTask_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "MachinePeriodicMaintenanceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
