import { isPageAccessRoute } from "@/lib/page-access-routes";
import { PAGE_SESSION_COOKIE, isValidPageSession } from "@/lib/page-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (!isPageAccessRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (isValidPageSession(request.cookies.get(PAGE_SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const accessUrl = request.nextUrl.clone();
  accessUrl.pathname = "/access";
  accessUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.rewrite(accessUrl);
}

export const config = {
  matcher: ["/about/:path*", "/blog/:path*", "/projects/:path*", "/anon"],
};
