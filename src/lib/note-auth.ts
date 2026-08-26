import "server-only";

import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

export const NOTE_PASSWORD_LIMITS = { min: 8, max: 128 } as const;
const NOTE_SESSION_MAX_AGE_SECONDS = 60 * 60;
const SCRYPT_KEY_LENGTH = 64;
const scryptAsync = promisify(scrypt);

function equals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(value: string, passwordHash: string) {
  return createHmac("sha256", passwordHash).update(value).digest("base64url");
}

export function isValidNotePasswordValue(password: string) {
  return password.length >= NOTE_PASSWORD_LIMITS.min && password.length <= NOTE_PASSWORD_LIMITS.max;
}

export async function hashNotePassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

export async function isValidNotePassword(password: string, storedHash: string | null) {
  if (!storedHash || !isValidNotePasswordValue(password)) return false;
  const [algorithm, salt, expected, ...extra] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expected || extra.length > 0) return false;

  try {
    const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
    return equals(derivedKey.toString("base64url"), expected);
  } catch {
    return false;
  }
}

export function getNoteSessionCookieName(noteId: string) {
  return `portfolio_note_access_${noteId}`;
}

export function createNoteSession(noteId: string, passwordHash: string) {
  const payload = Buffer.from(
    JSON.stringify({ id: noteId, exp: Date.now() + NOTE_SESSION_MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload, passwordHash)}`;
}

export function isValidNoteSession(
  session: string | undefined,
  noteId: string,
  passwordHash: string | null,
) {
  if (!session || !passwordHash) return false;
  const [payload, signature, ...extra] = session.split(".");
  if (
    !payload ||
    !signature ||
    extra.length > 0 ||
    !equals(signature, sign(payload, passwordHash))
  ) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      id?: unknown;
      exp?: unknown;
    };
    return parsed.id === noteId && typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function noteSessionCookie(slug: string) {
  return {
    httpOnly: true,
    maxAge: NOTE_SESSION_MAX_AGE_SECONDS,
    path: `/notes/${slug}`,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
