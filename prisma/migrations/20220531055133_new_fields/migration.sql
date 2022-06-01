-- AlterTable
ALTER TABLE "MachineHistory" ADD COLUMN     "currentRunningHrs" INTEGER,
ADD COLUMN     "interServiceHrs" INTEGER,
ADD COLUMN     "lastServiceHrs" INTEGER;
