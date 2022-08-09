/*
  Warnings:

  - You are about to drop the `EntityRepair` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EntityRepair" DROP CONSTRAINT "EntityRepair_approverId_fkey";

-- DropForeignKey
ALTER TABLE "EntityRepair" DROP CONSTRAINT "EntityRepair_entityId_fkey";

-- DropForeignKey
ALTER TABLE "EntityRepair" DROP CONSTRAINT "EntityRepair_operatorId_fkey";

-- DropForeignKey
ALTER TABLE "EntityRepair" DROP CONSTRAINT "EntityRepair_projectManagerId_fkey";

-- DropForeignKey
ALTER TABLE "EntityRepair" DROP CONSTRAINT "EntityRepair_requestorId_fkey";

-- DropForeignKey
ALTER TABLE "EntityRepair" DROP CONSTRAINT "EntityRepair_supervisorId_fkey";

-- DropTable
DROP TABLE "EntityRepair";

-- CreateTable
CREATE TABLE "EntityRepairRequest" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT true,
    "projectName" TEXT,
    "requestedAt" TIMESTAMP(3),
    "location" TEXT,
    "reason" TEXT,
    "additionalInfo" TEXT,
    "attendInfo" TEXT,
    "operatorId" INTEGER,
    "supervisorId" INTEGER,
    "projectManagerId" INTEGER,
    "requestorId" INTEGER,
    "approverId" INTEGER,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "EntityRepairRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EntityRepairRequest" ADD CONSTRAINT "EntityRepairRequest_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRepairRequest" ADD CONSTRAINT "EntityRepairRequest_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRepairRequest" ADD CONSTRAINT "EntityRepairRequest_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRepairRequest" ADD CONSTRAINT "EntityRepairRequest_requestorId_fkey" FOREIGN KEY ("requestorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRepairRequest" ADD CONSTRAINT "EntityRepairRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRepairRequest" ADD CONSTRAINT "EntityRepairRequest_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
