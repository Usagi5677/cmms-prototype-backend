-- AlterTable
ALTER TABLE "PeriodicMaintenance" ADD COLUMN     "copy" BOOLEAN,
ADD COLUMN     "originId" INTEGER,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" INTEGER;

-- AddForeignKey
ALTER TABLE "PeriodicMaintenance" ADD CONSTRAINT "PeriodicMaintenance_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodicMaintenance" ADD CONSTRAINT "PeriodicMaintenance_originId_fkey" FOREIGN KEY ("originId") REFERENCES "PeriodicMaintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
