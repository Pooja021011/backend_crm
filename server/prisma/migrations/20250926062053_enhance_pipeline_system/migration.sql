-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "attentionReason" TEXT,
ADD COLUMN     "clearToClose" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastContactAt" TIMESTAMP(3),
ADD COLUMN     "leadSourceId" TEXT,
ADD COLUMN     "needsAttention" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priceReduction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stageEnteredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PipelineStage" ADD COLUMN     "attentionThresholdHours" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresAction" BOOLEAN NOT NULL DEFAULT false;
