import { baseURL, person } from "@/resources";
import { HiArrowUpRight } from "react-icons/hi2";
import styles from "./DesktopHome.module.scss";

export function PortfolioPreview({
  headline,
  subline,
  routes,
}: {
  headline: string;
  subline: string;
  routes: { path: string; label: string }[];
}) {
  return (
    <div className={styles.preview} aria-hidden="true">
      <div className={styles.previewWindow}>
        <div className={styles.previewChrome}>
          <span className={styles.windowDots}>
            <i />
            <i />
            <i />
          </span>
          <span>{new URL(baseURL).host}</span>
          <HiArrowUpRight />
        </div>
        <div className={styles.previewPage}>
          <div className={styles.previewHeader}>
            <span>{person.name}</span>
            <span className={styles.previewNavigation}>
              Home <span>About</span> <span>Projects</span>
            </span>
          </div>
          <div className={styles.previewHero}>
            <span className={styles.previewEyebrow}>
              <i /> A personal corner of the internet
            </span>
            <strong>{headline}</strong>
            <span className={styles.previewDescription}>{subline}</span>
            <span className={styles.previewButton}>
              About me <HiArrowUpRight />
            </span>
          </div>
          <div className={styles.previewDirectory}>
            {routes.map((route) => (
              <span key={route.path}>
                {route.label} <HiArrowUpRight />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
