-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "measurement" TEXT,
    "previousValue" INTEGER,
    "value" INTEGER,
    "trigger" BOOLEAN,
    "measurementPeriodicMaintenanceId" INTEGER,
    "pmNotifPeriodicMaintenanceId" INTEGER,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_measurementPeriodicMaintenanceId_fkey" FOREIGN KEY ("measurementPeriodicMaintenanceId") REFERENCES "PeriodicMaintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_pmNotifPeriodicMaintenanceId_fkey" FOREIGN KEY ("pmNotifPeriodicMaintenanceId") REFERENCES "PeriodicMaintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
