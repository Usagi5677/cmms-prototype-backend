/*
  Warnings:

  - You are about to drop the `EntityPeriodicMaintenance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EntityPeriodicMaintenanceTask` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EntityPeriodicMaintenance" DROP CONSTRAINT "EntityPeriodicMaintenance_completedById_fkey";

-- DropForeignKey
ALTER TABLE "EntityPeriodicMaintenance" DROP CONSTRAINT "EntityPeriodicMaintenance_entityId_fkey";

-- DropForeignKey
ALTER TABLE "EntityPeriodicMaintenance" DROP CONSTRAINT "EntityPeriodicMaintenance_verifiedById_fkey";

-- DropForeignKey
ALTER TABLE "EntityPeriodicMaintenanceTask" DROP CONSTRAINT "EntityPeriodicMaintenanceTask_completedById_fkey";

-- DropForeignKey
ALTER TABLE "EntityPeriodicMaintenanceTask" DROP CONSTRAINT "EntityPeriodicMaintenanceTask_parentTaskId_fkey";

-- DropForeignKey
ALTER TABLE "EntityPeriodicMaintenanceTask" DROP CONSTRAINT "EntityPeriodicMaintenanceTask_periodicMaintenanceId_fkey";

-- DropTable
DROP TABLE "EntityPeriodicMaintenance";

-- DropTable
DROP TABLE "EntityPeriodicMaintenanceTask";
