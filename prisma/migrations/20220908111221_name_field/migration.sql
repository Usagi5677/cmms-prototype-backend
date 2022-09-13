/*
  Warnings:

  - Added the required column `name` to the `Breakdown` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Breakdown" ADD COLUMN     "name" TEXT NOT NULL;
