import { createHmac, timingSafeEqual } from "node:crypto";

export const PAGE_SESSION_COOKIE = "authToken";
const PAGE_SESSION_MAX_AGE_SECONDS = 60 * 60;

function equalsSecret(value: string, secret: string) {
  const valueBuffer = Buffer.from(value);
  const secretBuffer = Buffer.from(secret);
  return valueBuffer.length === secretBuffer.length && timingSafeEqual(valueBuffer, secretBuffer);
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function isValidPagePassword(password: string) {
  const configuredPassword = process.env.PAGE_ACCESS_PASSWORD;
  return Boolean(configuredPassword && equalsSecret(password, configuredPassword));
}

export function createPageSession() {
  const secret = process.env.PAGE_ACCESS_PASSWORD;
  if (!secret) return null;

  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + PAGE_SESSION_MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function isValidPageSession(session: string | undefined) {
  const secret = process.env.PAGE_ACCESS_PASSWORD;
  if (!session || !secret) return false;

  const [payload, signature, ...extra] = session.split(".");
  if (
    !payload ||
    !signature ||
    extra.length > 0 ||
    !equalsSecret(signature, sign(payload, secret))
  ) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: unknown;
    };
    return typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export const pageSessionCookie = {
  httpOnly: true,
  maxAge: PAGE_SESSION_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
};
