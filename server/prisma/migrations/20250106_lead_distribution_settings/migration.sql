-- CreateTable
CREATE TABLE "LeadDistributionSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "receiveLeads" BOOLEAN NOT NULL DEFAULT true,
    "distributionPercentage" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadDistributionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadDistributionSettings_userId_key" ON "LeadDistributionSettings"("userId");

-- AddForeignKey
ALTER TABLE "LeadDistributionSettings" ADD CONSTRAINT "LeadDistributionSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
