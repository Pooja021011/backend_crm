-- CreateTable
CREATE TABLE "LeadComparable" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "comparableId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadComparable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerOffer" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "offerAmount" INTEGER NOT NULL,
    "terms" JSONB,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingResource" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "fileId" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadComparable_leadId_idx" ON "LeadComparable"("leadId");

-- CreateIndex
CREATE INDEX "BuyerOffer_leadId_buyerId_idx" ON "BuyerOffer"("leadId", "buyerId");

-- CreateIndex
CREATE INDEX "MarketingResource_leadId_type_idx" ON "MarketingResource"("leadId", "type");

-- AddForeignKey
ALTER TABLE "LeadComparable" ADD CONSTRAINT "LeadComparable_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadComparable" ADD CONSTRAINT "LeadComparable_comparableId_fkey" FOREIGN KEY ("comparableId") REFERENCES "Comparable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerOffer" ADD CONSTRAINT "BuyerOffer_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerOffer" ADD CONSTRAINT "BuyerOffer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingResource" ADD CONSTRAINT "MarketingResource_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingResource" ADD CONSTRAINT "MarketingResource_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
