/*
  Warnings:

  - The values [AddMachine,EditMachine,DeleteMachine,AddTransportation,EditTransportation,DeleteTransportation] on the enum `Permission` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Permission_new" AS ENUM ('Add_Machine', 'Edit_Machine', 'Delete_Machine', 'Add_Transportation', 'Edit_Transportation', 'Delete_Transportation');
ALTER TABLE "PermissionRole" ALTER COLUMN "permission" TYPE "Permission_new" USING ("permission"::text::"Permission_new");
ALTER TYPE "Permission" RENAME TO "Permission_old";
ALTER TYPE "Permission_new" RENAME TO "Permission";
DROP TYPE "Permission_old";
COMMIT;
