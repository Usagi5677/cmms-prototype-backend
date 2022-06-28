-- AlterTable
ALTER TABLE "MachineBreakdown" ADD COLUMN     "estimatedDateOfRepair" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TransportationBreakdown" ADD COLUMN     "estimatedDateOfRepair" TIMESTAMP(3);
