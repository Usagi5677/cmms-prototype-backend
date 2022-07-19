/*
  Warnings:

  - You are about to drop the `MachineChecklistItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportationChecklistItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MachineChecklistItem" DROP CONSTRAINT "MachineChecklistItem_completedById_fkey";

-- DropForeignKey
ALTER TABLE "MachineChecklistItem" DROP CONSTRAINT "MachineChecklistItem_machineId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationChecklistItem" DROP CONSTRAINT "TransportationChecklistItem_completedById_fkey";

-- DropForeignKey
ALTER TABLE "TransportationChecklistItem" DROP CONSTRAINT "TransportationChecklistItem_transportationId_fkey";

-- AlterTable
ALTER TABLE "Machine" ADD COLUMN     "dailyChecklistTemplateId" INTEGER,
ADD COLUMN     "weeklyChecklistTemplateId" INTEGER;

-- AlterTable
ALTER TABLE "Transportation" ADD COLUMN     "dailyChecklistTemplateId" INTEGER,
ADD COLUMN     "weeklyChecklistTemplateId" INTEGER;

-- DropTable
DROP TABLE "MachineChecklistItem";

-- DropTable
DROP TABLE "TransportationChecklistItem";

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT E'Daily',

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplateItem" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "checklistTemplateId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checklist" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "machineId" INTEGER,
    "transportionId" INTEGER,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT E'Daily',
    "currentMeterReading" INTEGER,
    "workingHour" INTEGER,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "currentMeterReading" INTEGER,
    "workingHour" INTEGER,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Checklist_machineId_transportionId_from_to_type_key" ON "Checklist"("machineId", "transportionId", "from", "to", "type");

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_dailyChecklistTemplateId_fkey" FOREIGN KEY ("dailyChecklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_weeklyChecklistTemplateId_fkey" FOREIGN KEY ("weeklyChecklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_checklistTemplateId_fkey" FOREIGN KEY ("checklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_transportionId_fkey" FOREIGN KEY ("transportionId") REFERENCES "Transportation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transportation" ADD CONSTRAINT "Transportation_dailyChecklistTemplateId_fkey" FOREIGN KEY ("dailyChecklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transportation" ADD CONSTRAINT "Transportation_weeklyChecklistTemplateId_fkey" FOREIGN KEY ("weeklyChecklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
