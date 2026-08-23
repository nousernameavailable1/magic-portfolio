import "server-only";

import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { database } from "./database";

export const VISITOR_COOKIE = "portfolio_visitor";

const visitorCookie = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getExistingVisitorId(request: NextRequest) {
  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  return visitorId && UUID_PATTERN.test(visitorId) ? visitorId : null;
}

export function getVisitor(request: NextRequest) {
  const visitorId = getExistingVisitorId(request);
  return visitorId ? { visitorId, created: false } : { visitorId: randomUUID(), created: true };
}

export function setVisitorCookie(response: NextResponse, visitorId: string) {
  response.cookies.set(VISITOR_COOKIE, visitorId, visitorCookie);
}

export function clearVisitorCookie(response: NextResponse) {
  response.cookies.set(VISITOR_COOKIE, "", { ...visitorCookie, maxAge: 0 });
}

export async function recordVisit(visitorId: string) {
  const db = await database();
  await db.query(
    `
      INSERT INTO site_visitors (id)
      VALUES ($1::uuid)
      ON CONFLICT (id) DO UPDATE SET last_seen_at = NOW();
    `,
    [visitorId],
  );
  await db.query("INSERT INTO site_visits (visitor_id) VALUES ($1::uuid)", [visitorId]);
}

export async function removeVisitor(visitorId: string) {
  const db = await database();
  await db.query("DELETE FROM site_visitors WHERE id = $1::uuid", [visitorId]);
}
