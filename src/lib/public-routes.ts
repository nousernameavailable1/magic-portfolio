import "server-only";

import { database } from "./database";

export type PublicRoute = {
  path: string;
  label: string;
  parent?: string;
  lockedByDefault: boolean;
};

export type PublicRouteState = PublicRoute & {
  locked: boolean;
  listed: boolean;
};

export const publicRoutes: PublicRoute[] = [
  { path: "/", label: "Home", lockedByDefault: false },
  { path: "/about", label: "About", lockedByDefault: true },
  { path: "/blog", label: "Blog", lockedByDefault: true },
  { path: "/blog/blog", label: "Blog post: Blog", parent: "/blog", lockedByDefault: true },
  {
    path: "/blog/components",
    label: "Blog post: Components",
    parent: "/blog",
    lockedByDefault: true,
  },
  { path: "/blog/content", label: "Blog post: Content", parent: "/blog", lockedByDefault: true },
  {
    path: "/blog/localization",
    label: "Blog post: Localization",
    parent: "/blog",
    lockedByDefault: true,
  },
  {
    path: "/blog/mailchimp",
    label: "Blog post: Mailchimp",
    parent: "/blog",
    lockedByDefault: true,
  },
  { path: "/blog/pages", label: "Blog post: Pages", parent: "/blog", lockedByDefault: true },
  {
    path: "/blog/password",
    label: "Blog post: Password",
    parent: "/blog",
    lockedByDefault: true,
  },
  {
    path: "/blog/quick-start",
    label: "Blog post: Quick start",
    parent: "/blog",
    lockedByDefault: true,
  },
  { path: "/blog/seo", label: "Blog post: SEO", parent: "/blog", lockedByDefault: true },
  {
    path: "/blog/styling",
    label: "Blog post: Styling",
    parent: "/blog",
    lockedByDefault: true,
  },
  { path: "/blog/work", label: "Blog post: Work", parent: "/blog", lockedByDefault: true },
  { path: "/projects", label: "Projects", lockedByDefault: true },
  {
    path: "/projects/automate-design-handovers-with-a-figma-to-code-pipeline",
    label: "Project: Figma handovers",
    parent: "/projects",
    lockedByDefault: true,
  },
  {
    path: "/projects/magic-portfolio",
    label: "Project: Magic Portfolio",
    parent: "/projects",
    lockedByDefault: true,
  },
  {
    path: "/projects/simple-portfolio-builder",
    label: "Project: Portfolio builder",
    parent: "/projects",
    lockedByDefault: true,
  },
  { path: "/gallery", label: "Gallery", lockedByDefault: false },
  { path: "/wall", label: "Wall", lockedByDefault: true },
  { path: "/jumpscare", label: "Jumpscare", lockedByDefault: false },
  { path: "/rickroll", label: "Rickroll", lockedByDefault: false },
  { path: "/terminal", label: "Terminal", lockedByDefault: false },
  { path: "/statistics", label: "Statistics", lockedByDefault: false },
];

function getPublicRoute(path: string) {
  return publicRoutes.find((route) => route.path === path);
}

export function isManagedPublicRoute(path: string) {
  return Boolean(getPublicRoute(path));
}

export async function getPublicRouteStates(): Promise<PublicRouteState[]> {
  try {
    const db = await database();
    const result = await db.query<{ path: string; locked: boolean; listed: boolean }>(
      "SELECT path, locked, listed FROM public_route_locks",
    );
    const configuredSettings = new Map(result.rows.map((row) => [row.path, row]));

    return publicRoutes.map((route) => ({
      ...route,
      locked: configuredSettings.get(route.path)?.locked ?? route.lockedByDefault,
      listed: configuredSettings.get(route.path)?.listed ?? true,
    }));
  } catch {
    return publicRoutes.map((route) => ({ ...route, locked: route.lockedByDefault, listed: true }));
  }
}

export async function isPublicRouteLocked(path: string) {
  const states = await getPublicRouteStates();
  let route = states.find((state) => state.path === path);

  while (route) {
    if (route.locked) return true;
    const parentPath = route.parent;
    route = parentPath ? states.find((parent) => parent.path === parentPath) : undefined;
  }

  return false;
}

export async function updatePublicRouteSettings(
  path: string,
  updates: { locked?: boolean; listed?: boolean },
) {
  const route = getPublicRoute(path);
  if (!route) throw new Error("Unknown public route.");
  if (updates.locked === undefined && updates.listed === undefined) {
    throw new Error("No route settings were provided.");
  }

  const db = await database();
  const existing = await db.query<{ locked: boolean; listed: boolean }>(
    "SELECT locked, listed FROM public_route_locks WHERE path = $1",
    [path],
  );
  const current = existing.rows[0];
  const locked = updates.locked ?? current?.locked ?? route.lockedByDefault;
  const listed = updates.listed ?? current?.listed ?? true;

  await db.query(
    `
      INSERT INTO public_route_locks (path, locked, listed)
      VALUES ($1, $2, $3)
      ON CONFLICT (path) DO UPDATE
      SET locked = EXCLUDED.locked, listed = EXCLUDED.listed, updated_at = NOW()
    `,
    [path, locked, listed],
  );
}

export async function updatePublicRouteLock(path: string, locked: boolean) {
  if (!getPublicRoute(path)) throw new Error("Unknown public route.");
  await updatePublicRouteSettings(path, { locked });
}
