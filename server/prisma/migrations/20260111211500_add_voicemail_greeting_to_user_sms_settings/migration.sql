-- Add per-user voicemail greeting fields
ALTER TABLE "UserSmsSettings"
ADD COLUMN "voicemailGreetingPath" TEXT;

ALTER TABLE "UserSmsSettings"
ADD COLUMN "voicemailGreetingUpdatedAt" TIMESTAMP(3);


