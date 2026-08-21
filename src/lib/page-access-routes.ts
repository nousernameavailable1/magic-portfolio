/**
 * Public page prefixes that require the site access password.
 *
 * Keep this list independent of Node-only modules: it is shared by the
 * server-side Proxy and the client-safe site configuration.
 */
export const pageAccessRoutes = ["/about", "/blog", "/projects", "/anon"] as const;

export function isPageAccessRoute(pathname: string) {
  return pageAccessRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
