import { type PublicRouteState, getPublicRouteStates } from "@/lib/public-routes";
import { about, home, person } from "@/resources";
import { getProjectPosts } from "@/utils/utils";
import { Avatar } from "@once-ui-system/core";
import Link from "next/link";
import { HiArrowDown, HiArrowRight, HiArrowUpRight, HiChevronDown } from "react-icons/hi2";
import styles from "./DesktopHome.module.scss";
import { PortfolioPreview } from "./PortfolioPreview";

const descriptions: Record<string, string> = {
  "/": "Back to the beginning",
  "/about": "A little more about me",
  "/projects": "Things I’ve been building",
  "/blog": "Ideas, guides & longer reads",
  "/notes": "Thoughts along the way",
  "/gallery": "Life through a different lens",
  "/wall": "Leave something behind",
  "/terminal": "Take the scenic route",
  "/statistics": "This site, by the numbers",
};

function routeLabel(route: PublicRouteState) {
  return route.label.replace(/^Blog post: |^Project: /, "");
}

function DirectoryChildren({ parent, routes }: { parent: string; routes: PublicRouteState[] }) {
  const children = routes.filter((route) => route.parent === parent);
  if (!children.length) return null;

  return (
    <ul className={styles.children}>
      {children.map((route) => (
        <li key={route.path}>
          <Link href={route.path} prefetch={false}>
            {routeLabel(route)}
            <HiArrowUpRight aria-hidden="true" />
          </Link>
          <DirectoryChildren parent={route.path} routes={routes} />
        </li>
      ))}
    </ul>
  );
}

export async function DesktopHome({
  headline,
  subline,
  afterHours,
}: { headline: string; subline: string; afterHours: boolean }) {
  const routes = (await getPublicRouteStates()).filter((route) => route.listed);
  const topLevelRoutes = routes.filter((route) => route.path === "/" || !route.parent);
  const featuredProject = home.featured.display
    ? getProjectPosts().find((project) => `/projects/${project.slug}` === home.featured.href)
    : undefined;
  const isPortfolio = featuredProject?.slug === "magic-portfolio";
  const previewRoutes = topLevelRoutes.filter((route) =>
    ["/projects", "/blog", "/gallery"].includes(route.path),
  );

  return (
    <div className={styles.desktop} data-desktop-home>
      <section className={styles.hero} aria-labelledby="desktop-home-title">
        <div className={styles.introduction}>
          <p className={styles.eyebrow}>
            <span className={styles.statusDot} aria-hidden="true" />
            {person.name}
            <span className={styles.eyebrowDivider} aria-hidden="true">
              /
            </span>
            {afterHours ? "After hours" : person.role}
          </p>
          <h1 id="desktop-home-title" className={styles.headline}>
            {headline}
          </h1>
          <p className={styles.description}>{subline}</p>
          <div className={styles.actions}>
            <Link id="about" className={styles.aboutLink} href={about.path}>
              {about.avatar.display && <Avatar src={person.avatar} size="s" />}
              <span>{about.title}</span>
              <HiArrowUpRight aria-hidden="true" />
            </Link>
            <a className={styles.exploreLink} href="#desktop-directory">
              Explore the site <HiArrowDown aria-hidden="true" />
            </a>
          </div>
        </div>
        {home.featured.display && (
          <Link
            className={styles.featured}
            href={home.featured.href}
            aria-labelledby="featured-project-title"
            aria-describedby="featured-project-description"
          >
            <div className={styles.featuredTop}>
              <span className={styles.eyebrow}>Featured project</span>
              <HiArrowUpRight className={styles.featuredArrow} aria-hidden="true" />
            </div>
            {isPortfolio && (
              <PortfolioPreview
                headline={headline}
                subline={subline}
                routes={previewRoutes.map((route) => ({
                  path: route.path,
                  label: routeLabel(route),
                }))}
              />
            )}
            <div className={styles.featuredBottom}>
              <h2 className={styles.featuredTitle} id="featured-project-title">
                {featuredProject?.metadata.title ?? "Featured project"}
              </h2>
              <p className={styles.featuredDescription} id="featured-project-description">
                {isPortfolio
                  ? "The website you’re exploring. A personal space for projects, writing, and experiments."
                  : featuredProject?.metadata.summary}
              </p>
              <span className={styles.featuredCta}>
                {isPortfolio && (
                  <span className={styles.projectStack}>Next.js / MDX / PostgreSQL</span>
                )}
                <span className={styles.caseStudyLink}>
                  View project <HiArrowRight aria-hidden="true" />
                </span>
              </span>
            </div>
          </Link>
        )}
      </section>

      <section
        id="desktop-directory"
        className={styles.directory}
        aria-labelledby="desktop-directory-title"
      >
        <div className={styles.directoryHeading}>
          <div>
            <p className={styles.eyebrow}>The directory</p>
            <h2 id="desktop-directory-title">A few places to start.</h2>
          </div>
          <span className={styles.directoryNote}>Pick a direction. Have a look around.</span>
        </div>
        <nav aria-label="Desktop site map">
          <ol className={styles.routes}>
            {topLevelRoutes.map((route, index) => {
              const children = routes.filter((child) => child.parent === route.path);
              return (
                <li className={styles.route} key={route.path}>
                  <Link
                    className={styles.routeLink}
                    href={route.path}
                    prefetch={false}
                    aria-current={route.path === "/" ? "page" : undefined}
                  >
                    <span className={styles.routeNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.routeCopy}>
                      <span className={styles.routeTitle}>{routeLabel(route)}</span>
                      {descriptions[route.path] && (
                        <span className={styles.routeDescription}>{descriptions[route.path]}</span>
                      )}
                    </span>
                    <HiArrowUpRight className={styles.routeArrow} aria-hidden="true" />
                  </Link>
                  {children.length > 0 && (
                    <details className={styles.routeDetails}>
                      <summary>
                        {children.length} pages <HiChevronDown aria-hidden="true" />
                      </summary>
                      <DirectoryChildren parent={route.path} routes={routes} />
                    </details>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </section>
    </div>
  );
}
