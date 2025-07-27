-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "color" VARCHAR(255),
    "icon" VARCHAR(255),
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objective_area" (
    "objectiveId" UUID NOT NULL,
    "areaId" UUID NOT NULL,

    CONSTRAINT "objective_area_pkey" PRIMARY KEY ("objectiveId","areaId")
);

-- AddForeignKey
ALTER TABLE "objective_area" ADD CONSTRAINT "objective_area_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "objectives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_area" ADD CONSTRAINT "objective_area_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
