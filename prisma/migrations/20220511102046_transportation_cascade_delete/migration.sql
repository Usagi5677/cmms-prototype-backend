-- DropForeignKey
ALTER TABLE "TransportAttachment" DROP CONSTRAINT "TransportAttachment_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationAssignment" DROP CONSTRAINT "TransportationAssignment_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationBreakdown" DROP CONSTRAINT "TransportationBreakdown_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationChecklistItem" DROP CONSTRAINT "TransportationChecklistItem_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationHistory" DROP CONSTRAINT "TransportationHistory_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationPeriodicMaintenance" DROP CONSTRAINT "TransportationPeriodicMaintenance_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationRepair" DROP CONSTRAINT "TransportationRepair_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationSparePR" DROP CONSTRAINT "TransportationSparePR_transportationId_fkey";

-- AlterTable
ALTER TABLE "TransportationHistory" ADD COLUMN     "completedById" INTEGER;

-- AddForeignKey
ALTER TABLE "TransportationAssignment" ADD CONSTRAINT "TransportationAssignment_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationChecklistItem" ADD CONSTRAINT "TransportationChecklistItem_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationPeriodicMaintenance" ADD CONSTRAINT "TransportationPeriodicMaintenance_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportAttachment" ADD CONSTRAINT "TransportAttachment_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationHistory" ADD CONSTRAINT "TransportationHistory_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationHistory" ADD CONSTRAINT "TransportationHistory_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationRepair" ADD CONSTRAINT "TransportationRepair_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationBreakdown" ADD CONSTRAINT "TransportationBreakdown_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationSparePR" ADD CONSTRAINT "TransportationSparePR_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
