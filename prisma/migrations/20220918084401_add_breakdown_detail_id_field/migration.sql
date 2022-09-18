-- AlterTable
ALTER TABLE "Repair" ADD COLUMN     "breakdownDetailId" INTEGER;

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_breakdownDetailId_fkey" FOREIGN KEY ("breakdownDetailId") REFERENCES "BreakdownDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
