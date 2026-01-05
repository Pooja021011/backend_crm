-- Inbox dismiss/read markers (per-user)
-- Note: In this DB, ids are stored as TEXT.

CREATE TABLE "TaskRead" (
  "taskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskRead_pkey" PRIMARY KEY ("taskId","userId")
);

CREATE INDEX "TaskRead_userId_readAt_idx"
  ON "TaskRead" ("userId","readAt");

ALTER TABLE "TaskRead"
  ADD CONSTRAINT "TaskRead_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskRead"
  ADD CONSTRAINT "TaskRead_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GmailEmailRead" (
  "emailId" TEXT NOT NULL,
  "userId"  TEXT NOT NULL,
  "readAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GmailEmailRead_pkey" PRIMARY KEY ("emailId","userId")
);

CREATE INDEX "GmailEmailRead_userId_readAt_idx"
  ON "GmailEmailRead" ("userId","readAt");

ALTER TABLE "GmailEmailRead"
  ADD CONSTRAINT "GmailEmailRead_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;


