type PresenceRecord = {
  online: boolean;
  updatedAt: number; // epoch ms
};

// In-memory presence. Good enough for single-node deployment.
// If you run multiple server instances, move this to Redis.
const presenceByUserId = new Map<string, PresenceRecord>();

// If we haven't heard from a user recently, consider them offline (safety net).
// This prevents "stuck online" after browser/tab crash.
const PRESENCE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const voicePresenceService = {
  setOnline(userId: string, online: boolean) {
    presenceByUserId.set(userId, { online, updatedAt: Date.now() });
  },

  heartbeat(userId: string) {
    const existing = presenceByUserId.get(userId);
    presenceByUserId.set(userId, { online: existing?.online ?? true, updatedAt: Date.now() });
  },

  isOnline(userId: string): boolean {
    const rec = presenceByUserId.get(userId);
    if (!rec) return false;
    if (!rec.online) return false;
    if (Date.now() - rec.updatedAt > PRESENCE_TTL_MS) return false;
    return true;
  },
};


