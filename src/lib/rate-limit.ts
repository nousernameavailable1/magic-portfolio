import { createHmac } from "node:crypto";

type RateLimitEntry = { count: number; resetAt: number };
const submissions = new Map<string, RateLimitEntry>();
const reactions = new Map<string, RateLimitEntry>();
const notePasswords = new Map<string, RateLimitEntry>();
const WINDOW_MS = 10 * 1000;
const CLEANUP_THRESHOLD = 100;

function removeExpiredEntries(entries: Map<string, RateLimitEntry>, now: number) {
  if (entries.size < CLEANUP_THRESHOLD) return;

  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key);
  }
}

function isRateLimited(
  entries: Map<string, RateLimitEntry>,
  forwardedFor: string | null,
  limit: number,
  windowMs = WINDOW_MS,
  identifier = "",
) {
  const address = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const secret = process.env.ADMIN_SESSION_SECRET || "unconfigured-rate-limit-secret";
  const key = createHmac("sha256", secret).update(`${address}:${identifier}`).digest("hex");
  const now = Date.now();
  removeExpiredEntries(entries, now);
  const entry = entries.get(key);

  if (!entry || entry.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  return entry.count > limit;
}

export function isSubmissionRateLimited(forwardedFor: string | null) {
  return isRateLimited(submissions, forwardedFor, 5);
}

export function isReactionRateLimited(forwardedFor: string | null) {
  return isRateLimited(reactions, forwardedFor, 12);
}

export function isNotePasswordRateLimited(forwardedFor: string | null, slug: string) {
  return isRateLimited(notePasswords, forwardedFor, 5, 60 * 1000, slug);
}
