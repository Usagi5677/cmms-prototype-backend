/*
  Warnings:

  - You are about to drop the column `machineId` on the `Checklist` table. All the data in the column will be lost.
  - You are about to drop the column `transportationId` on the `Checklist` table. All the data in the column will be lost.
  - You are about to drop the `Machine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MachineAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MachineAttachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MachineBreakdown` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MachineHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MachinePeriodicMaintenance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MachinePeriodicMaintenanceTask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MachineRepair` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MachineSparePR` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transportation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportationAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportationAttachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportationBreakdown` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportationHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportationPeriodicMaintenance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportationPeriodicMaintenanceTask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportationRepair` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportationSparePR` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[entityId,from,to,type]` on the table `Checklist` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Checklist" DROP CONSTRAINT "Checklist_machineId_fkey";

-- DropForeignKey
ALTER TABLE "Checklist" DROP CONSTRAINT "Checklist_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "Machine" DROP CONSTRAINT "Machine_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Machine" DROP CONSTRAINT "Machine_dailyChecklistTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "Machine" DROP CONSTRAINT "Machine_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Machine" DROP CONSTRAINT "Machine_typeId_fkey";

-- DropForeignKey
ALTER TABLE "Machine" DROP CONSTRAINT "Machine_weeklyChecklistTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "MachineAssignment" DROP CONSTRAINT "MachineAssignment_machineId_fkey";

-- DropForeignKey
ALTER TABLE "MachineAssignment" DROP CONSTRAINT "MachineAssignment_userId_fkey";

-- DropForeignKey
ALTER TABLE "MachineAttachment" DROP CONSTRAINT "MachineAttachment_machineId_fkey";

-- DropForeignKey
ALTER TABLE "MachineAttachment" DROP CONSTRAINT "MachineAttachment_userId_fkey";

-- DropForeignKey
ALTER TABLE "MachineBreakdown" DROP CONSTRAINT "MachineBreakdown_completedById_fkey";

-- DropForeignKey
ALTER TABLE "MachineBreakdown" DROP CONSTRAINT "MachineBreakdown_machineId_fkey";

-- DropForeignKey
ALTER TABLE "MachineHistory" DROP CONSTRAINT "MachineHistory_completedById_fkey";

-- DropForeignKey
ALTER TABLE "MachineHistory" DROP CONSTRAINT "MachineHistory_machineId_fkey";

-- DropForeignKey
ALTER TABLE "MachinePeriodicMaintenance" DROP CONSTRAINT "MachinePeriodicMaintenance_completedById_fkey";

-- DropForeignKey
ALTER TABLE "MachinePeriodicMaintenance" DROP CONSTRAINT "MachinePeriodicMaintenance_machineId_fkey";

-- DropForeignKey
ALTER TABLE "MachinePeriodicMaintenance" DROP CONSTRAINT "MachinePeriodicMaintenance_verifiedById_fkey";

-- DropForeignKey
ALTER TABLE "MachinePeriodicMaintenanceTask" DROP CONSTRAINT "MachinePeriodicMaintenanceTask_completedById_fkey";

-- DropForeignKey
ALTER TABLE "MachinePeriodicMaintenanceTask" DROP CONSTRAINT "MachinePeriodicMaintenanceTask_parentTaskId_fkey";

-- DropForeignKey
ALTER TABLE "MachinePeriodicMaintenanceTask" DROP CONSTRAINT "MachinePeriodicMaintenanceTask_periodicMaintenanceId_fkey";

-- DropForeignKey
ALTER TABLE "MachineRepair" DROP CONSTRAINT "MachineRepair_completedById_fkey";

-- DropForeignKey
ALTER TABLE "MachineRepair" DROP CONSTRAINT "MachineRepair_machineId_fkey";

-- DropForeignKey
ALTER TABLE "MachineSparePR" DROP CONSTRAINT "MachineSparePR_completedById_fkey";

-- DropForeignKey
ALTER TABLE "MachineSparePR" DROP CONSTRAINT "MachineSparePR_machineId_fkey";

-- DropForeignKey
ALTER TABLE "Transportation" DROP CONSTRAINT "Transportation_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Transportation" DROP CONSTRAINT "Transportation_dailyChecklistTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "Transportation" DROP CONSTRAINT "Transportation_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Transportation" DROP CONSTRAINT "Transportation_typeId_fkey";

-- DropForeignKey
ALTER TABLE "Transportation" DROP CONSTRAINT "Transportation_weeklyChecklistTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationAssignment" DROP CONSTRAINT "TransportationAssignment_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationAssignment" DROP CONSTRAINT "TransportationAssignment_userId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationAttachment" DROP CONSTRAINT "TransportationAttachment_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationAttachment" DROP CONSTRAINT "TransportationAttachment_userId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationBreakdown" DROP CONSTRAINT "TransportationBreakdown_completedById_fkey";

-- DropForeignKey
ALTER TABLE "TransportationBreakdown" DROP CONSTRAINT "TransportationBreakdown_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationHistory" DROP CONSTRAINT "TransportationHistory_completedById_fkey";

-- DropForeignKey
ALTER TABLE "TransportationHistory" DROP CONSTRAINT "TransportationHistory_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationPeriodicMaintenance" DROP CONSTRAINT "TransportationPeriodicMaintenance_completedById_fkey";

-- DropForeignKey
ALTER TABLE "TransportationPeriodicMaintenance" DROP CONSTRAINT "TransportationPeriodicMaintenance_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationPeriodicMaintenance" DROP CONSTRAINT "TransportationPeriodicMaintenance_verifiedById_fkey";

-- DropForeignKey
ALTER TABLE "TransportationPeriodicMaintenanceTask" DROP CONSTRAINT "TransportationPeriodicMaintenanceTask_completedById_fkey";

-- DropForeignKey
ALTER TABLE "TransportationPeriodicMaintenanceTask" DROP CONSTRAINT "TransportationPeriodicMaintenanceTask_parentTaskId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationPeriodicMaintenanceTask" DROP CONSTRAINT "TransportationPeriodicMaintenanceTask_periodicMaintenanceI_fkey";

-- DropForeignKey
ALTER TABLE "TransportationRepair" DROP CONSTRAINT "TransportationRepair_completedById_fkey";

-- DropForeignKey
ALTER TABLE "TransportationRepair" DROP CONSTRAINT "TransportationRepair_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportationSparePR" DROP CONSTRAINT "TransportationSparePR_completedById_fkey";

-- DropForeignKey
ALTER TABLE "TransportationSparePR" DROP CONSTRAINT "TransportationSparePR_transportationId_fkey";

-- DropIndex
DROP INDEX "Checklist_machineId_transportationId_entityId_from_to_type_key";

-- AlterTable
ALTER TABLE "Checklist" DROP COLUMN "machineId",
DROP COLUMN "transportationId";

-- DropTable
DROP TABLE "Machine";

-- DropTable
DROP TABLE "MachineAssignment";

-- DropTable
DROP TABLE "MachineAttachment";

-- DropTable
DROP TABLE "MachineBreakdown";

-- DropTable
DROP TABLE "MachineHistory";

-- DropTable
DROP TABLE "MachinePeriodicMaintenance";

-- DropTable
DROP TABLE "MachinePeriodicMaintenanceTask";

-- DropTable
DROP TABLE "MachineRepair";

-- DropTable
DROP TABLE "MachineSparePR";

-- DropTable
DROP TABLE "Transportation";

-- DropTable
DROP TABLE "TransportationAssignment";

-- DropTable
DROP TABLE "TransportationAttachment";

-- DropTable
DROP TABLE "TransportationBreakdown";

-- DropTable
DROP TABLE "TransportationHistory";

-- DropTable
DROP TABLE "TransportationPeriodicMaintenance";

-- DropTable
DROP TABLE "TransportationPeriodicMaintenanceTask";

-- DropTable
DROP TABLE "TransportationRepair";

-- DropTable
DROP TABLE "TransportationSparePR";

-- DropEnum
DROP TYPE "MachineStatus";

-- DropEnum
DROP TYPE "TransportationStatus";

-- CreateIndex
CREATE UNIQUE INDEX "Checklist_entityId_from_to_type_key" ON "Checklist"("entityId", "from", "to", "type");
