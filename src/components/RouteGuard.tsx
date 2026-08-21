"use client";

import NotFound from "@/app/not-found";
import { routes } from "@/resources";
import { usePathname } from "next/navigation";

interface RouteGuardProps {
  children: React.ReactNode;
}

function isRouteEnabled(pathname: string) {
  if (pathname in routes) {
    return routes[pathname as keyof typeof routes];
  }

  if (pathname === "/access" || pathname.startsWith("/admin")) {
    return true;
  }

  return ["/blog", "/projects"].some(
    (route) => pathname.startsWith(route) && routes[route as keyof typeof routes],
  );
}

/**
 * Keeps disabled routes out of the client navigation tree.
 * Password enforcement happens in src/proxy.ts before a protected page is rendered.
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname() ?? "";
  return isRouteEnabled(pathname) ? children : <NotFound />;
}
