import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "portfolio_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function equalsSecret(value: string, secret: string) {
  const valueBuffer = Buffer.from(value);
  const secretBuffer = Buffer.from(secret);
  return valueBuffer.length === secretBuffer.length && timingSafeEqual(valueBuffer, secretBuffer);
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function isValidAdminPassword(password: string) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  return Boolean(configuredPassword && equalsSecret(password, configuredPassword));
}

export function createAdminSession() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) return null;

  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function isValidAdminSession(session: string | undefined) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!session || !secret || secret.length < 32) return false;

  const [payload, signature, ...extra] = session.split(".");
  if (!payload || !signature || extra.length > 0 || !equalsSecret(signature, sign(payload, secret))) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export const adminSessionCookie = {
  httpOnly: true,
  maxAge: SESSION_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
};
