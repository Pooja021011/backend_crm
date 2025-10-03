-- DropForeignKey
ALTER TABLE "BuyerCriteria" DROP CONSTRAINT "BuyerCriteria_leadId_fkey";

-- DropForeignKey
ALTER TABLE "BuyerDetail" DROP CONSTRAINT "BuyerDetail_leadId_fkey";

-- DropForeignKey
ALTER TABLE "BuyerOffer" DROP CONSTRAINT "BuyerOffer_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Communication" DROP CONSTRAINT "Communication_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_leadId_fkey";

-- DropForeignKey
ALTER TABLE "LeadAddress" DROP CONSTRAINT "LeadAddress_leadId_fkey";

-- DropForeignKey
ALTER TABLE "LeadBuyer" DROP CONSTRAINT "LeadBuyer_leadId_fkey";

-- DropForeignKey
ALTER TABLE "LeadComparable" DROP CONSTRAINT "LeadComparable_leadId_fkey";

-- DropForeignKey
ALTER TABLE "LeadFile" DROP CONSTRAINT "LeadFile_leadId_fkey";

-- DropForeignKey
ALTER TABLE "MarketingLink" DROP CONSTRAINT "MarketingLink_leadId_fkey";

-- DropForeignKey
ALTER TABLE "MarketingResource" DROP CONSTRAINT "MarketingResource_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_dealId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_leadId_fkey";

-- DropForeignKey
ALTER TABLE "SellerDetail" DROP CONSTRAINT "SellerDetail_leadId_fkey";

-- DropForeignKey
ALTER TABLE "StageHistory" DROP CONSTRAINT "StageHistory_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_leadId_fkey";

-- DropForeignKey
ALTER TABLE "UnderwritingScenario" DROP CONSTRAINT "UnderwritingScenario_leadId_fkey";

-- DropForeignKey
ALTER TABLE "VendorDetail" DROP CONSTRAINT "VendorDetail_leadId_fkey";

-- AddForeignKey
ALTER TABLE "LeadAddress" ADD CONSTRAINT "LeadAddress_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerDetail" ADD CONSTRAINT "SellerDetail_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerDetail" ADD CONSTRAINT "BuyerDetail_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerCriteria" ADD CONSTRAINT "BuyerCriteria_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDetail" ADD CONSTRAINT "VendorDetail_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageHistory" ADD CONSTRAINT "StageHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFile" ADD CONSTRAINT "LeadFile_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnderwritingScenario" ADD CONSTRAINT "UnderwritingScenario_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadBuyer" ADD CONSTRAINT "LeadBuyer_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingLink" ADD CONSTRAINT "MarketingLink_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadComparable" ADD CONSTRAINT "LeadComparable_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerOffer" ADD CONSTRAINT "BuyerOffer_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingResource" ADD CONSTRAINT "MarketingResource_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
