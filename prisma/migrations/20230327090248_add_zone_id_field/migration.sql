-- AlterTable
ALTER TABLE "UserAssignment" ADD COLUMN     "zoneId" INTEGER;

-- AddForeignKey
ALTER TABLE "UserAssignment" ADD CONSTRAINT "UserAssignment_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
