import { createHmac } from "node:crypto";

type RateLimitEntry = { count: number; resetAt: number };
const submissions = new Map<string, RateLimitEntry>();
const WINDOW_MS = 10 * 1000;
const LIMIT = 5;
const CLEANUP_THRESHOLD = 100;

function removeExpiredEntries(now: number) {
  if (submissions.size < CLEANUP_THRESHOLD) return;

  for (const [key, entry] of submissions) {
    if (entry.resetAt <= now) submissions.delete(key);
  }
}

export function isSubmissionRateLimited(forwardedFor: string | null) {
  const address = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const secret = process.env.ADMIN_SESSION_SECRET || "unconfigured-rate-limit-secret";
  const key = createHmac("sha256", secret).update(address).digest("hex");
  const now = Date.now();
  removeExpiredEntries(now);
  const entry = submissions.get(key);

  if (!entry || entry.resetAt <= now) {
    submissions.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > LIMIT;
}
