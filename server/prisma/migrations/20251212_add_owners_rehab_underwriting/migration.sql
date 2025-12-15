-- CreateTable
CREATE TABLE "LeadOwner" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RehabBudget" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "finishLevel" TEXT,
    "toggledItems" JSONB NOT NULL,
    "customValues" JSONB,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contingencyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RehabBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnderwritingCalculation" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "arv" DOUBLE PRECISION NOT NULL,
    "rehabCost" DOUBLE PRECISION NOT NULL,
    "taxes" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "timeline" INTEGER NOT NULL DEFAULT 6,
    "finalOffer" DOUBLE PRECISION NOT NULL,
    "calculatedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnderwritingCalculation_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "dispAgentId" TEXT;

-- CreateIndex
CREATE INDEX "LeadOwner_leadId_idx" ON "LeadOwner"("leadId");

-- CreateIndex
CREATE INDEX "LeadOwner_leadId_isPrimary_idx" ON "LeadOwner"("leadId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "RehabBudget_leadId_key" ON "RehabBudget"("leadId");

-- CreateIndex
CREATE INDEX "UnderwritingCalculation_leadId_createdAt_idx" ON "UnderwritingCalculation"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_dispAgentId_idx" ON "Lead"("dispAgentId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_dispAgentId_fkey" FOREIGN KEY ("dispAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadOwner" ADD CONSTRAINT "LeadOwner_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehabBudget" ADD CONSTRAINT "RehabBudget_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnderwritingCalculation" ADD CONSTRAINT "UnderwritingCalculation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnderwritingCalculation" ADD CONSTRAINT "UnderwritingCalculation_calculatedBy_fkey" FOREIGN KEY ("calculatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

