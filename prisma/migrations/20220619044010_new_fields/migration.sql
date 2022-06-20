-- AlterTable
ALTER TABLE "MachinePeriodicMaintenanceTask" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedById" INTEGER;

-- AddForeignKey
ALTER TABLE "MachinePeriodicMaintenanceTask" ADD CONSTRAINT "MachinePeriodicMaintenanceTask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
