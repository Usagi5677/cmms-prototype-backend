/*
  Warnings:

  - You are about to drop the column `transportionId` on the `Checklist` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[machineId,transportationId,from,to,type]` on the table `Checklist` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Checklist" DROP CONSTRAINT "Checklist_transportionId_fkey";

-- DropIndex
DROP INDEX "Checklist_machineId_transportionId_from_to_type_key";

-- AlterTable
ALTER TABLE "Checklist" DROP COLUMN "transportionId",
ADD COLUMN     "transportationId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Checklist_machineId_transportationId_from_to_type_key" ON "Checklist"("machineId", "transportationId", "from", "to", "type");

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
