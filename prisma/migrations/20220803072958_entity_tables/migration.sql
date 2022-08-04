/*
  Warnings:

  - A unique constraint covering the columns `[machineId,transportationId,entityId,from,to,type]` on the table `Checklist` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('Working', 'Idle', 'Breakdown', 'Dispose');

-- DropIndex
DROP INDEX "Checklist_machineId_transportationId_from_to_type_key";

-- AlterTable
ALTER TABLE "Checklist" ADD COLUMN     "entityId" INTEGER;

-- CreateTable
CREATE TABLE "Entity" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "machineNumber" TEXT,
    "registeredDate" TIMESTAMP(3),
    "model" TEXT,
    "typeId" INTEGER,
    "type" TEXT,
    "zone" TEXT,
    "location" TEXT,
    "currentRunning" INTEGER,
    "lastService" INTEGER,
    "department" TEXT,
    "engine" TEXT,
    "currentMileage" INTEGER,
    "lastServiceMileage" INTEGER,
    "brand" TEXT,
    "status" "EntityStatus" DEFAULT E'Working',
    "statusChangedAt" TIMESTAMP(3),
    "measurement" TEXT DEFAULT E'km',
    "isDeleted" BOOLEAN,
    "deletedAt" TIMESTAMP(3),
    "deletedById" INTEGER,
    "dailyChecklistTemplateId" INTEGER,
    "weeklyChecklistTemplateId" INTEGER,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityAssignment" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "entityId" INTEGER NOT NULL,

    CONSTRAINT "EntityAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityPeriodicMaintenance" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "measurement" TEXT,
    "value" INTEGER,
    "startDate" TIMESTAMP(3),
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "status" "PeriodicMaintenanceStatus" NOT NULL DEFAULT E'Pending',
    "verifiedById" INTEGER,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "EntityPeriodicMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityAttachment" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "entityId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "mimeType" TEXT,
    "originalName" TEXT,
    "sharepointFileName" TEXT,
    "mode" TEXT NOT NULL DEFAULT E'Public',

    CONSTRAINT "EntityAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityPeriodicMaintenanceTask" (
    "id" SERIAL NOT NULL,
    "periodicMaintenanceId" INTEGER NOT NULL,
    "parentTaskId" INTEGER,
    "name" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "EntityPeriodicMaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityHistory" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "completedById" INTEGER,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entityStatus" "EntityStatus",
    "entityType" TEXT,
    "workingHour" DOUBLE PRECISION,
    "idleHour" DOUBLE PRECISION,
    "breakdownHour" DOUBLE PRECISION,
    "location" TEXT,

    CONSTRAINT "EntityHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityRepair" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "status" "RepairStatus" NOT NULL DEFAULT E'Pending',

    CONSTRAINT "EntityRepair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityBreakdown" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "estimatedDateOfRepair" TIMESTAMP(3),
    "status" "BreakdownStatus" NOT NULL DEFAULT E'Breakdown',

    CONSTRAINT "EntityBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntitySparePR" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "status" "SparePRStatus" NOT NULL DEFAULT E'Pending',

    CONSTRAINT "EntitySparePR_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntityAssignment_userId_entityId_key" ON "EntityAssignment"("userId", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Checklist_machineId_transportationId_entityId_from_to_type_key" ON "Checklist"("machineId", "transportationId", "entityId", "from", "to", "type");

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_dailyChecklistTemplateId_fkey" FOREIGN KEY ("dailyChecklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_weeklyChecklistTemplateId_fkey" FOREIGN KEY ("weeklyChecklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityAssignment" ADD CONSTRAINT "EntityAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityAssignment" ADD CONSTRAINT "EntityAssignment_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityPeriodicMaintenance" ADD CONSTRAINT "EntityPeriodicMaintenance_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityPeriodicMaintenance" ADD CONSTRAINT "EntityPeriodicMaintenance_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityPeriodicMaintenance" ADD CONSTRAINT "EntityPeriodicMaintenance_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityAttachment" ADD CONSTRAINT "EntityAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityAttachment" ADD CONSTRAINT "EntityAttachment_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityPeriodicMaintenanceTask" ADD CONSTRAINT "EntityPeriodicMaintenanceTask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityPeriodicMaintenanceTask" ADD CONSTRAINT "EntityPeriodicMaintenanceTask_periodicMaintenanceId_fkey" FOREIGN KEY ("periodicMaintenanceId") REFERENCES "EntityPeriodicMaintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityPeriodicMaintenanceTask" ADD CONSTRAINT "EntityPeriodicMaintenanceTask_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "EntityPeriodicMaintenanceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityHistory" ADD CONSTRAINT "EntityHistory_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityHistory" ADD CONSTRAINT "EntityHistory_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRepair" ADD CONSTRAINT "EntityRepair_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRepair" ADD CONSTRAINT "EntityRepair_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityBreakdown" ADD CONSTRAINT "EntityBreakdown_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityBreakdown" ADD CONSTRAINT "EntityBreakdown_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitySparePR" ADD CONSTRAINT "EntitySparePR_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitySparePR" ADD CONSTRAINT "EntitySparePR_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
