/*
  Warnings:

  - You are about to drop the `objective_area` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "objective_area" DROP CONSTRAINT "objective_area_areaId_fkey";

-- DropForeignKey
ALTER TABLE "objective_area" DROP CONSTRAINT "objective_area_objectiveId_fkey";

-- DropTable
DROP TABLE "objective_area";

-- CreateTable
CREATE TABLE "_AreaToObjective" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_AreaToObjective_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AreaToObjective_B_index" ON "_AreaToObjective"("B");

-- AddForeignKey
ALTER TABLE "_AreaToObjective" ADD CONSTRAINT "_AreaToObjective_A_fkey" FOREIGN KEY ("A") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AreaToObjective" ADD CONSTRAINT "_AreaToObjective_B_fkey" FOREIGN KEY ("B") REFERENCES "objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
