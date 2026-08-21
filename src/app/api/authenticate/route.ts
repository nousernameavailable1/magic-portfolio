import {
  PAGE_SESSION_COOKIE,
  createPageSession,
  isValidPagePassword,
  pageSessionCookie,
} from "@/lib/page-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof payload?.password === "string" ? payload.password : "";
  const session = createPageSession();

  if (!session) {
    console.error("PAGE_ACCESS_PASSWORD environment variable is not set");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }

  if (!isValidPagePassword(password)) {
    return NextResponse.json({ message: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(PAGE_SESSION_COOKIE, session, pageSessionCookie);
  return response;
}
