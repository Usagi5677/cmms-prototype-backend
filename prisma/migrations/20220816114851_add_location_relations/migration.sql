/*
  Warnings:

  - You are about to drop the column `location` on the `EntityHistory` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `EntityRepairRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EntityHistory" DROP COLUMN "location";

-- AlterTable
ALTER TABLE "EntityRepairRequest" DROP COLUMN "location";

-- AddForeignKey
ALTER TABLE "EntityHistory" ADD CONSTRAINT "EntityHistory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRepairRequest" ADD CONSTRAINT "EntityRepairRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
