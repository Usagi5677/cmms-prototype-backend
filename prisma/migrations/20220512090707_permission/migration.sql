/*
  Warnings:

  - The values [Add_Machine,Edit_Machine,Delete_Machine,Add_Transportation,Edit_Transportation,Delete_Transportation] on the enum `Permission` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Permission_new" AS ENUM ('ADD_MACHINE', 'EDIT_MACHINE', 'DELETE_MACHINE', 'ADD_TRANSPORTATION', 'EDIT_TRANSPORTATION', 'DELETE_TRANSPORTATION');
ALTER TABLE "PermissionRole" ALTER COLUMN "permission" TYPE "Permission_new" USING ("permission"::text::"Permission_new");
ALTER TYPE "Permission" RENAME TO "Permission_old";
ALTER TYPE "Permission_new" RENAME TO "Permission";
DROP TYPE "Permission_old";
COMMIT;
