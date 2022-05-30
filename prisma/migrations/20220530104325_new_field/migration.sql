-- AlterTable
ALTER TABLE "MachinePeriodicMaintenance" ADD COLUMN     "fixedDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TransportationPeriodicMaintenance" ADD COLUMN     "fixedDate" TIMESTAMP(3);
