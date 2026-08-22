import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const WALL_REACTION_COOKIE = "wall_reaction_visitor";

const reactionCookie = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getReactionVisitor(request: NextRequest) {
  const visitorId = request.cookies.get(WALL_REACTION_COOKIE)?.value;
  if (visitorId && UUID_PATTERN.test(visitorId)) {
    return { visitorId, created: false };
  }

  return { visitorId: randomUUID(), created: true };
}

export function setReactionVisitorCookie(response: NextResponse, visitorId: string) {
  response.cookies.set(WALL_REACTION_COOKIE, visitorId, reactionCookie);
}
