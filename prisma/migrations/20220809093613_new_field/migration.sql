-- AlterTable
ALTER TABLE "EntityRepairRequest" ADD COLUMN     "repairedAt" TIMESTAMP(3),
ADD COLUMN     "repairedById" INTEGER;

-- AddForeignKey
ALTER TABLE "EntityRepairRequest" ADD CONSTRAINT "EntityRepairRequest_repairedById_fkey" FOREIGN KEY ("repairedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
