-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Permission" ADD VALUE 'ADD_ROLE';
ALTER TYPE "Permission" ADD VALUE 'EDIT_ROLE';
ALTER TYPE "Permission" ADD VALUE 'DELETE_ROLE';
ALTER TYPE "Permission" ADD VALUE 'ADD_PERMISSION';
ALTER TYPE "Permission" ADD VALUE 'EDIT_PERMISSION';
ALTER TYPE "Permission" ADD VALUE 'DELETE_PERMISSION';
