"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./route-map-manager.module.scss";

type PublicRouteState = {
  path: string;
  label: string;
  parent?: string;
  locked: boolean;
  listed: boolean;
};

type RouteUpdate = Pick<PublicRouteState, "locked" | "listed">;
type RouteSetting = keyof RouteUpdate;
type SavingRoute = { path: string; setting: RouteSetting } | null;
type MapView = "public" | "admin";

type AdminRoute = {
  path: string;
  label: string;
  parent?: string;
};

const adminRoutes: AdminRoute[] = [
  { path: "/admin", label: "Admin" },
  { path: "/admin/login", label: "Login", parent: "/admin" },
  { path: "/admin/wall", label: "Wall moderation", parent: "/admin" },
  { path: "/admin/fakemail", label: "Fakemail", parent: "/admin" },
  { path: "/admin/vpn", label: "VPN", parent: "/admin" },
  { path: "/admin/status", label: "Status", parent: "/admin" },
  { path: "/admin/text", label: "Text", parent: "/admin" },
  { path: "/admin/map", label: "Map", parent: "/admin" },
];

function RouteBranch({
  route,
  routes,
  savingRoute,
  updateRoute,
  hiddenByParent = false,
  lockedByParent = false,
}: {
  route: PublicRouteState;
  routes: PublicRouteState[];
  savingRoute: SavingRoute;
  updateRoute: (path: string, update: Partial<RouteUpdate>) => Promise<void>;
  hiddenByParent?: boolean;
  lockedByParent?: boolean;
}) {
  const children = routes.filter((child) => child.parent === route.path);
  const isSaving = savingRoute?.path === route.path;
  const isSavingLock = isSaving && savingRoute?.setting === "locked";
  const isSavingVisibility = isSaving && savingRoute?.setting === "listed";
  const visibilityDisabled = isSaving || hiddenByParent;
  const lockDisabled = isSaving || lockedByParent;

  return (
    <li className={styles.branch}>
      <article className={styles.route}>
        <div className={styles.routeDetails}>
          <strong>{route.label}</strong>
          <code>{route.path}</code>
        </div>
        <div className={styles.actions}>
          <button
            aria-label={
              lockedByParent
                ? `${route.label} is locked by its parent`
                : `${route.locked ? "Unlock" : "Lock"} ${route.label}`
            }
            aria-pressed={route.locked || lockedByParent}
            className={`${route.locked || lockedByParent ? styles.locked : styles.unlocked}${
              lockedByParent ? ` ${styles.inherited}` : ""
            }`}
            disabled={lockDisabled}
            onClick={() => void updateRoute(route.path, { locked: !route.locked })}
            type="button"
          >
            {isSavingLock ? "Saving…" : route.locked || lockedByParent ? "Locked" : "Public"}
          </button>
          <button
            aria-label={
              hiddenByParent
                ? `${route.label} is hidden by its parent in the public map`
                : `${route.listed ? "Hide" : "Show"} ${route.label} in the public map`
            }
            aria-pressed={route.listed && !hiddenByParent}
            className={route.listed && !hiddenByParent ? styles.listed : styles.hidden}
            disabled={visibilityDisabled}
            onClick={() => void updateRoute(route.path, { listed: !route.listed })}
            type="button"
          >
            {isSavingVisibility ? "Saving…" : route.listed && !hiddenByParent ? "In map" : "Hidden"}
          </button>
        </div>
      </article>
      {children.length > 0 && (
        <ul className={styles.children}>
          {children.map((child) => (
            <RouteBranch
              key={child.path}
              route={child}
              routes={routes}
              savingRoute={savingRoute}
              updateRoute={updateRoute}
              hiddenByParent={hiddenByParent || !route.listed}
              lockedByParent={lockedByParent || route.locked}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function AdminRouteBranch({ route, routes }: { route: AdminRoute; routes: AdminRoute[] }) {
  const children = routes.filter((child) => child.parent === route.path);

  return (
    <li className={styles.branch}>
      <Link className={`${styles.route} ${styles.adminRoute}`} href={route.path}>
        <div className={styles.routeDetails}>
          <strong>{route.label}</strong>
          <code>{route.path}</code>
        </div>
      </Link>
      {children.length > 0 && (
        <ul className={styles.children}>
          {children.map((child) => (
            <AdminRouteBranch key={child.path} route={child} routes={routes} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function RouteMapManager({ initialRoutes }: { initialRoutes: PublicRouteState[] }) {
  const [routes, setRoutes] = useState(initialRoutes);
  const [savingRoute, setSavingRoute] = useState<SavingRoute>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<MapView>("public");
  const topLevelRoutes = routes.filter((route) => route.path === "/" || !route.parent);
  const topLevelAdminRoutes = adminRoutes.filter((route) => !route.parent);

  const updateRoute = async (path: string, update: Partial<RouteUpdate>) => {
    const setting = update.locked === undefined ? "listed" : "locked";
    setSavingRoute({ path, setting });
    setError(null);

    try {
      const response = await fetch("/api/admin/map", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, ...update }),
      });
      const data = (await response.json()) as { routes?: PublicRouteState[]; error?: string };
      if (!response.ok || !data.routes) throw new Error(data.error);

      setRoutes(data.routes);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update this route.");
    } finally {
      setSavingRoute(null);
    }
  };

  return (
    <section className={styles.manager} aria-labelledby="route-map-title">
      <header>
        <div className={styles.headingRow}>
          <div>
            <h1 id="route-map-title">Site map</h1>
            <span>
              {view === "public"
                ? "Manage public access and map visibility. Changes take effect immediately for visitors without an active access session."
                : "Browse every admin page and jump directly to it."}
            </span>
          </div>
          <fieldset className={styles.viewToggle}>
            <legend className={styles.srOnly}>Map view</legend>
            <button
              aria-pressed={view === "public"}
              className={view === "public" ? styles.activeView : undefined}
              onClick={() => setView("public")}
              type="button"
            >
              Public pages
            </button>
            <button
              aria-pressed={view === "admin"}
              className={view === "admin" ? styles.activeView : undefined}
              onClick={() => setView("admin")}
              type="button"
            >
              Admin pages
            </button>
          </fieldset>
        </div>
      </header>
      {view === "public" && error && <p className={styles.error}>{error}</p>}
      <div className={styles.routes}>
        {view === "public" ? (
          <ul className={styles.branches}>
            {topLevelRoutes.map((route) => (
              <RouteBranch
                key={route.path}
                route={route}
                routes={routes}
                savingRoute={savingRoute}
                updateRoute={updateRoute}
              />
            ))}
          </ul>
        ) : (
          <ul className={styles.branches}>
            {topLevelAdminRoutes.map((route) => (
              <AdminRouteBranch key={route.path} route={route} routes={adminRoutes} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
