-- CreateTable
CREATE TABLE "GoogleSheetsConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "credentials" JSONB,
    "spreadsheetId" TEXT,
    "sheetName" TEXT,
    "headerRow" INTEGER NOT NULL DEFAULT 1,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "syncInterval" INTEGER NOT NULL DEFAULT 60,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "columnMappings" JSONB,
    "totalLeadsSynced" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleSheetsConfig_pkey" PRIMARY KEY ("id")
);
