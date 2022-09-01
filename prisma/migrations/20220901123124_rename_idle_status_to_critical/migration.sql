/*
  Warnings:

  - The values [Idle] on the enum `EntityStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EntityStatus_new" AS ENUM ('Working', 'Critical', 'Breakdown', 'Dispose');
ALTER TABLE "Entity" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Entity" ALTER COLUMN "status" TYPE "EntityStatus_new" USING ("status"::text::"EntityStatus_new");
ALTER TABLE "EntityHistory" ALTER COLUMN "entityStatus" TYPE "EntityStatus_new" USING ("entityStatus"::text::"EntityStatus_new");
ALTER TYPE "EntityStatus" RENAME TO "EntityStatus_old";
ALTER TYPE "EntityStatus_new" RENAME TO "EntityStatus";
DROP TYPE "EntityStatus_old";
ALTER TABLE "Entity" ALTER COLUMN "status" SET DEFAULT 'Working';
COMMIT;
