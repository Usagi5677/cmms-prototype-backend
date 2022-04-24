-- DropForeignKey
ALTER TABLE "MachineAssignment" DROP CONSTRAINT "MachineAssignment_machineId_fkey";

-- AddForeignKey
ALTER TABLE "MachineAssignment" ADD CONSTRAINT "MachineAssignment_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
