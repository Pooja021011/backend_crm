-- Add per-user read tracking for communications (used for Inbox dismiss behavior)
-- Note: In this DB, ids are stored as TEXT (not UUID), even though Prisma uses @default(uuid()).

DROP TABLE IF EXISTS "CommunicationRead";

CREATE TABLE "CommunicationRead" (
  "communicationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationRead_pkey" PRIMARY KEY ("communicationId","userId")
);

CREATE INDEX "CommunicationRead_userId_readAt_idx"
  ON "CommunicationRead" ("userId","readAt");

ALTER TABLE "CommunicationRead"
  ADD CONSTRAINT "CommunicationRead_communicationId_fkey"
  FOREIGN KEY ("communicationId") REFERENCES "Communication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationRead"
  ADD CONSTRAINT "CommunicationRead_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;


