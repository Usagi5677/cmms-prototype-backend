/*
  Warnings:

  - You are about to drop the column `location` on the `Entity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "location";

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
