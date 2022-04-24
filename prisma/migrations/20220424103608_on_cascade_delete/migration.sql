-- DropForeignKey
ALTER TABLE "MachineAttachment" DROP CONSTRAINT "MachineAttachment_machineId_fkey";

-- DropForeignKey
ALTER TABLE "MachineBreakdown" DROP CONSTRAINT "MachineBreakdown_machineId_fkey";

-- DropForeignKey
ALTER TABLE "MachineChecklistItem" DROP CONSTRAINT "MachineChecklistItem_machineId_fkey";

-- DropForeignKey
ALTER TABLE "MachineHistory" DROP CONSTRAINT "MachineHistory_machineId_fkey";

-- DropForeignKey
ALTER TABLE "MachinePeriodicMaintenance" DROP CONSTRAINT "MachinePeriodicMaintenance_machineId_fkey";

-- DropForeignKey
ALTER TABLE "MachineRepair" DROP CONSTRAINT "MachineRepair_machineId_fkey";

-- DropForeignKey
ALTER TABLE "MachineSparePR" DROP CONSTRAINT "MachineSparePR_machineId_fkey";

-- AddForeignKey
ALTER TABLE "MachineAttachment" ADD CONSTRAINT "MachineAttachment_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineChecklistItem" ADD CONSTRAINT "MachineChecklistItem_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachinePeriodicMaintenance" ADD CONSTRAINT "MachinePeriodicMaintenance_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineHistory" ADD CONSTRAINT "MachineHistory_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineRepair" ADD CONSTRAINT "MachineRepair_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineBreakdown" ADD CONSTRAINT "MachineBreakdown_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSparePR" ADD CONSTRAINT "MachineSparePR_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
