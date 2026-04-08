/*
  Warnings:

  - Added the required column `userId` to the `areas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "areas" ADD COLUMN     "userId" UUID NOT NULL;
