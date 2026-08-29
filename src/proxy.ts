import { PAGE_SESSION_COOKIE, isValidPageSession } from "@/lib/page-auth";
import { isManagedPublicRoute, isPublicRouteLocked } from "@/lib/public-routes";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!isManagedPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (isValidPageSession(request.cookies.get(PAGE_SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (!(await isPublicRouteLocked(pathname))) {
    return NextResponse.next();
  }

  const accessUrl = request.nextUrl.clone();
  accessUrl.pathname = "/access";
  accessUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.rewrite(accessUrl);
}

export const config = {
  matcher: [
    "/",
    "/about",
    "/blog/:path*",
    "/notes/:path*",
    "/projects/:path*",
    "/gallery",
    "/wall",
    "/jumpscare",
    "/rickroll",
    "/terminal",
    "/statistics",
  ],
};
