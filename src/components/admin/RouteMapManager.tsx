"use client";

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

function RouteBranch({
  route,
  routes,
  savingPath,
  updateRoute,
  hiddenByParent = false,
  lockedByParent = false,
}: {
  route: PublicRouteState;
  routes: PublicRouteState[];
  savingPath: string | null;
  updateRoute: (path: string, update: Partial<RouteUpdate>) => Promise<void>;
  hiddenByParent?: boolean;
  lockedByParent?: boolean;
}) {
  const children = routes.filter((child) => child.parent === route.path);
  const isSaving = savingPath === route.path;
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
            {isSaving ? "Saving…" : route.locked || lockedByParent ? "Locked" : "Public"}
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
            {isSaving ? "Saving…" : route.listed && !hiddenByParent ? "In map" : "Hidden"}
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
              savingPath={savingPath}
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

export function RouteMapManager({ initialRoutes }: { initialRoutes: PublicRouteState[] }) {
  const [routes, setRoutes] = useState(initialRoutes);
  const [savingPath, setSavingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const topLevelRoutes = routes.filter((route) => route.path === "/" || !route.parent);

  const updateRoute = async (path: string, update: Partial<RouteUpdate>) => {
    setSavingPath(path);
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
      setSavingPath(null);
    }
  };

  return (
    <section className={styles.manager} aria-labelledby="route-map-title">
      <header>
        <h1 id="route-map-title">Site map</h1>
        <span>
          Manage public access and map visibility. Changes take effect immediately for visitors
          without an active access session.
        </span>
      </header>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.routes}>
        <ul className={styles.branches}>
          {topLevelRoutes.map((route) => (
            <RouteBranch
              key={route.path}
              route={route}
              routes={routes}
              savingPath={savingPath}
              updateRoute={updateRoute}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
