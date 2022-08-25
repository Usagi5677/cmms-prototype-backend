-- CreateTable
CREATE TABLE "PeriodicMaintenanceTask" (
    "id" SERIAL NOT NULL,
    "periodicMaintenanceId" INTEGER NOT NULL,
    "parentTaskId" INTEGER,
    "name" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PeriodicMaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodicMaintenanceComment" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "periodicMaintenanceTaskId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT E'Remark',
    "description" TEXT NOT NULL,
    "userId" INTEGER,
    "periodicMaintenanceId" INTEGER,

    CONSTRAINT "PeriodicMaintenanceComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodicMaintenance" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "previousMeterReading" INTEGER DEFAULT 0,
    "currentMeterReading" INTEGER,
    "entityId" INTEGER,

    CONSTRAINT "PeriodicMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PeriodicMaintenance_entityId_from_to_key" ON "PeriodicMaintenance"("entityId", "from", "to");

-- AddForeignKey
ALTER TABLE "PeriodicMaintenanceTask" ADD CONSTRAINT "PeriodicMaintenanceTask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodicMaintenanceTask" ADD CONSTRAINT "PeriodicMaintenanceTask_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "PeriodicMaintenanceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodicMaintenanceTask" ADD CONSTRAINT "PeriodicMaintenanceTask_periodicMaintenanceId_fkey" FOREIGN KEY ("periodicMaintenanceId") REFERENCES "PeriodicMaintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodicMaintenanceComment" ADD CONSTRAINT "PeriodicMaintenanceComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodicMaintenanceComment" ADD CONSTRAINT "PeriodicMaintenanceComment_periodicMaintenanceTaskId_fkey" FOREIGN KEY ("periodicMaintenanceTaskId") REFERENCES "PeriodicMaintenanceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodicMaintenanceComment" ADD CONSTRAINT "PeriodicMaintenanceComment_periodicMaintenanceId_fkey" FOREIGN KEY ("periodicMaintenanceId") REFERENCES "PeriodicMaintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodicMaintenance" ADD CONSTRAINT "PeriodicMaintenance_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
