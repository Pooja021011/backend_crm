-- AlterTable
ALTER TABLE "BuyerDetail" ADD COLUMN     "creditScore" TEXT,
ADD COLUMN     "motivation" TEXT,
ADD COLUMN     "preApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timeline" TEXT;
