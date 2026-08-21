import { PAGE_SESSION_COOKIE, isValidPageSession } from "@/lib/page-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  if (isValidPageSession(request.cookies.get(PAGE_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ authenticated: true }, { status: 200 });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
