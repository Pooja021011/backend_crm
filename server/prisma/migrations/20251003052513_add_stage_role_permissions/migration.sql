-- CreateTable
CREATE TABLE "StageRolePermission" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "roleName" "RoleName" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StageRolePermission_stageId_idx" ON "StageRolePermission"("stageId");

-- CreateIndex
CREATE INDEX "StageRolePermission_roleName_idx" ON "StageRolePermission"("roleName");

-- CreateIndex
CREATE UNIQUE INDEX "StageRolePermission_stageId_roleName_key" ON "StageRolePermission"("stageId", "roleName");

-- AddForeignKey
ALTER TABLE "StageRolePermission" ADD CONSTRAINT "StageRolePermission_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
