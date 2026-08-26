"use client";

import { useEffect, useState } from "react";
import { HiChevronDown, HiOutlineMap } from "react-icons/hi2";
import styles from "./PublicRouteMap.module.scss";

type PublicRouteState = {
  path: string;
  label: string;
  parent?: string;
};

function getRouteLabel(route: PublicRouteState) {
  return route.label.replace(/^Blog post: |^Project: /, "");
}

function RouteBranch({ route, routes }: { route: PublicRouteState; routes: PublicRouteState[] }) {
  const children = routes.filter((child) => child.parent === route.path);

  return (
    <li className={styles.branch}>
      <a className={styles.node} href={route.path}>
        {getRouteLabel(route)}
      </a>
      {children.length > 0 && (
        <ul className={styles.children}>
          {children.map((child) => (
            <RouteBranch key={child.path} route={child} routes={routes} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function PublicRouteMapClient({ routes }: { routes: PublicRouteState[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const topLevelRoutes = routes.filter((route) => route.path === "/" || !route.parent);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        aria-controls="public-route-map"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close site map" : "Open site map"}
        className={styles.mobileToggle}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <HiOutlineMap aria-hidden="true" />
        <span className={styles.mobileToggleCopy}>
          <small>Site directory</small>
          <strong>Explore every page</strong>
        </span>
        <HiChevronDown className={styles.mobileToggleChevron} aria-hidden="true" />
      </button>
      <button
        aria-label="Close site map"
        className={`${styles.mobileBackdrop} ${isOpen ? styles.mobileBackdropVisible : ""}`}
        onClick={() => setIsOpen(false)}
        tabIndex={isOpen ? 0 : -1}
        type="button"
      />
      <section
        id="public-route-map"
        className={`${styles.section} ${isOpen ? styles.mobileOpen : ""}`}
        aria-labelledby="public-map-title"
      >
        <div className={styles.heading}>
          <p>Explore</p>
          <h2 id="public-map-title">Map</h2>
        </div>
        <nav className={styles.map} aria-label="Public site map">
          <ul className={styles.branches}>
            {topLevelRoutes.map((route) => (
              <RouteBranch key={route.path} route={route} routes={routes} />
            ))}
          </ul>
        </nav>
      </section>
    </>
  );
}
