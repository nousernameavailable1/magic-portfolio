import { type PublicRouteState, getPublicRouteStates } from "@/lib/public-routes";
import styles from "./PublicRouteMap.module.scss";

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

export async function PublicRouteMap() {
  const routes = (await getPublicRouteStates()).filter((route) => route.listed);
  const topLevelRoutes = routes.filter((route) => route.path === "/" || !route.parent);

  return (
    <section className={styles.section} aria-labelledby="public-map-title">
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
  );
}
