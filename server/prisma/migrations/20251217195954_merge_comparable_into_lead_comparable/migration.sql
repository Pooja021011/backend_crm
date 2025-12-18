-- Step 1: Add new columns to LeadComparable table
ALTER TABLE "LeadComparable" ADD COLUMN "address" TEXT;
ALTER TABLE "LeadComparable" ADD COLUMN "city" TEXT;
ALTER TABLE "LeadComparable" ADD COLUMN "state" TEXT;
ALTER TABLE "LeadComparable" ADD COLUMN "zip" TEXT;
ALTER TABLE "LeadComparable" ADD COLUMN "beds" INTEGER;
ALTER TABLE "LeadComparable" ADD COLUMN "baths" INTEGER;
ALTER TABLE "LeadComparable" ADD COLUMN "sqft" INTEGER;
ALTER TABLE "LeadComparable" ADD COLUMN "yearBuilt" INTEGER;
ALTER TABLE "LeadComparable" ADD COLUMN "salePrice" INTEGER;
ALTER TABLE "LeadComparable" ADD COLUMN "pricePerSqft" INTEGER;
ALTER TABLE "LeadComparable" ADD COLUMN "dom" INTEGER;
ALTER TABLE "LeadComparable" ADD COLUMN "dateSold" TIMESTAMP(3);
ALTER TABLE "LeadComparable" ADD COLUMN "images" TEXT[];
ALTER TABLE "LeadComparable" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 2: Migrate data from Comparable to LeadComparable
UPDATE "LeadComparable" lc
SET 
  "address" = c."address",
  "city" = c."city",
  "state" = c."state",
  "zip" = c."zip",
  "beds" = c."beds",
  "baths" = c."baths",
  "sqft" = c."sqft",
  "yearBuilt" = c."yearBuilt",
  "salePrice" = c."salePrice",
  "pricePerSqft" = c."pricePerSqft",
  "dom" = c."dom",
  "dateSold" = c."dateSold",
  "images" = c."images",
  "createdAt" = c."createdAt"
FROM "Comparable" c
WHERE lc."comparableId" = c."id";

-- Step 3: Make new columns NOT NULL (after data migration)
ALTER TABLE "LeadComparable" ALTER COLUMN "address" SET NOT NULL;
ALTER TABLE "LeadComparable" ALTER COLUMN "city" SET NOT NULL;
ALTER TABLE "LeadComparable" ALTER COLUMN "state" SET NOT NULL;
ALTER TABLE "LeadComparable" ALTER COLUMN "zip" SET NOT NULL;

-- Step 4: Drop foreign key constraint
ALTER TABLE "LeadComparable" DROP CONSTRAINT "LeadComparable_comparableId_fkey";

-- Step 5: Drop comparableId column
ALTER TABLE "LeadComparable" DROP COLUMN "comparableId";

-- Step 6: Update foreign key to cascade on delete
ALTER TABLE "LeadComparable" DROP CONSTRAINT "LeadComparable_leadId_fkey";
ALTER TABLE "LeadComparable" ADD CONSTRAINT "LeadComparable_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Drop Comparable table
DROP TABLE "Comparable";



