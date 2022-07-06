-- AlterTable
ALTER TABLE "MachinePeriodicMaintenance" ADD COLUMN     "verifiedById" INTEGER,
ADD COLUMN     "verifiedDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TransportationPeriodicMaintenance" ADD COLUMN     "verifiedById" INTEGER,
ADD COLUMN     "verifiedDate" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "MachinePeriodicMaintenance" ADD CONSTRAINT "MachinePeriodicMaintenance_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationPeriodicMaintenance" ADD CONSTRAINT "TransportationPeriodicMaintenance_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
