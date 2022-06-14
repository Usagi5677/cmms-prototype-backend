-- AlterTable
ALTER TABLE "MachineChecklistItem" ADD COLUMN     "currentMeterReading" INTEGER,
ADD COLUMN     "workingHour" INTEGER;

-- AlterTable
ALTER TABLE "TransportationChecklistItem" ADD COLUMN     "currentMeterReading" INTEGER,
ADD COLUMN     "measurement" TEXT,
ADD COLUMN     "workingHour" INTEGER;
