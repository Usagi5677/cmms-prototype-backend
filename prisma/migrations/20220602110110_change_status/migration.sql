/*
  Warnings:

  - The values [Pending] on the enum `MachineStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [Pending] on the enum `TransportationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MachineStatus_new" AS ENUM ('Working', 'Idle', 'Breakdown');
ALTER TABLE "Machine" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Machine" ALTER COLUMN "status" TYPE "MachineStatus_new" USING ("status"::text::"MachineStatus_new");
ALTER TABLE "MachineHistory" ALTER COLUMN "machineStatus" TYPE "MachineStatus_new" USING ("machineStatus"::text::"MachineStatus_new");
ALTER TYPE "MachineStatus" RENAME TO "MachineStatus_old";
ALTER TYPE "MachineStatus_new" RENAME TO "MachineStatus";
DROP TYPE "MachineStatus_old";
ALTER TABLE "Machine" ALTER COLUMN "status" SET DEFAULT 'Working';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TransportationStatus_new" AS ENUM ('Working', 'Idle', 'Breakdown');
ALTER TABLE "Transportation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Transportation" ALTER COLUMN "status" TYPE "TransportationStatus_new" USING ("status"::text::"TransportationStatus_new");
ALTER TABLE "TransportationHistory" ALTER COLUMN "transportationStatus" TYPE "TransportationStatus_new" USING ("transportationStatus"::text::"TransportationStatus_new");
ALTER TYPE "TransportationStatus" RENAME TO "TransportationStatus_old";
ALTER TYPE "TransportationStatus_new" RENAME TO "TransportationStatus";
DROP TYPE "TransportationStatus_old";
ALTER TABLE "Transportation" ALTER COLUMN "status" SET DEFAULT 'Working';
COMMIT;
