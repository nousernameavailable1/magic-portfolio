"use client";

import type { PortfolioSourceMetrics } from "@/lib/portfolio-case-study";
import type { getPublicSiteStats } from "@/lib/site-stats";
import { formatDubaiDateTime, formatDuration } from "@/utils/formatDate";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  HiArrowPath,
  HiArrowUpRight,
  HiOutlineCodeBracket,
  HiOutlineServerStack,
} from "react-icons/hi2";
import { SourceCodeCharts } from "./SourceCodeCharts";
import styles from "./desktop-statistics.module.scss";

type Stats = Awaited<ReturnType<typeof getPublicSiteStats>>;

export function DesktopStatistics({
  stats,
  source,
}: { stats: Stats; source: PortfolioSourceMetrics | null }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const seconds = stats.processUptimeSeconds;
  const elapsed = [
    Math.floor(seconds / 86400),
    Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ];
  const labels = ["Days", "Hours", "Minutes", "Seconds"];
  const files = source?.layers.reduce((sum, item) => sum + item.files, 0);
  const lines = source?.layers.reduce((sum, item) => sum + item.lines, 0);
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(stats.checkedAt);
  const number = (value: number | undefined) =>
    value === undefined ? "Unavailable" : value.toLocaleString("en");

  return (
    <div className={styles.desktop}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>BEHIND THE WEBSITE</span>
          <h1>
            Statistics<span>.</span>
          </h1>
        </div>
        <div className={styles.heroAside}>
          <p>A look under the surface.</p>
          <span>The running process, the source it serves, and how the pieces add up.</span>
          <div className={styles.snapshot}>
            <span>
              <i /> SERVER SNAPSHOT
            </span>
            <time dateTime={stats.checkedAt.toISOString()}>
              {clock} <small>Dubai</small>
            </time>
          </div>
        </div>
      </header>
      <div className={styles.toolbar}>
        <p aria-live="polite">
          {refreshing
            ? "Reading a fresh server snapshot…"
            : `Captured ${formatDubaiDateTime(stats.checkedAt)} · Asia/Dubai`}
        </p>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => startRefresh(() => router.refresh())}
        >
          <HiArrowPath aria-hidden="true" className={refreshing ? styles.spinning : undefined} />
          {refreshing ? "Refreshing…" : "Refresh snapshot"}
        </button>
      </div>
      <div className={styles.summary}>
        <div>
          <span>PROCESS UPTIME</span>
          <strong>{formatDuration(seconds)}</strong>
          <small>Since this server process started</small>
        </div>
        <div>
          <span>NODE RUNTIME</span>
          <strong>{stats.nodeVersion}</strong>
          <small>Version reported by the server</small>
        </div>
        <div>
          <span>SOURCE FILES</span>
          <strong>{number(files)}</strong>
          <small>Files included in the charts below</small>
        </div>
        <div>
          <span>REPOSITORY CODE</span>
          <strong>{number(stats.code.available ? stats.code.nonEmptyLineCount : undefined)}</strong>
          <small>Non-empty lines · build snapshot</small>
        </div>
      </div>

      <section className={styles.section} aria-labelledby="stats-runtime-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>01 / RIGHT NOW</span>
          <h2 id="stats-runtime-title">
            One process. A point in time<span>.</span>
          </h2>
        </div>
        <div className={styles.runtimeGrid}>
          <div className={styles.runtime}>
            <div className={styles.panelHeading}>
              <span>
                <HiOutlineServerStack aria-hidden="true" /> PROCESS LIFETIME
              </span>
              <code>Node {stats.nodeVersion}</code>
            </div>
            <div className={styles.elapsed}>
              {elapsed.map((value, index) => (
                <div key={labels[index]}>
                  <strong>{String(value).padStart(2, "0")}</strong>
                  <span>{labels[index]}</span>
                </div>
              ))}
            </div>
            <div className={styles.timeline}>
              <div>
                <span>STARTED</span>
                <time dateTime={stats.startedAt.toISOString()}>
                  {formatDubaiDateTime(stats.startedAt)}
                </time>
              </div>
              <span className={styles.timelineLine} aria-hidden="true" />
              <div>
                <span>CAPTURED</span>
                <time dateTime={stats.checkedAt.toISOString()}>{clock}</time>
              </div>
            </div>
            <p>
              Measured from the active process, in Asia/Dubai time. A restart resets the count.
              Refresh to capture a new value; this is not a historical availability measurement.
            </p>
          </div>
          <div className={styles.inventory}>
            <div className={styles.panelHeading}>
              <span>
                <HiOutlineCodeBracket aria-hidden="true" /> SOURCE INVENTORY
              </span>
              <code>src/</code>
            </div>
            <dl>
              <div>
                <dt>All files</dt>
                <dd>{number(stats.source.available ? stats.source.totalFileCount : undefined)}</dd>
              </div>
              <div>
                <dt>Directories</dt>
                <dd>{number(stats.source.available ? stats.source.directoryCount : undefined)}</dd>
              </div>
              <div>
                <dt>Source text files</dt>
                <dd>{number(stats.source.available ? stats.source.fileCount : undefined)}</dd>
              </div>
              <div>
                <dt>Non-empty source lines</dt>
                <dd>
                  {number(stats.source.available ? stats.source.nonEmptyLineCount : undefined)}
                </dd>
              </div>
            </dl>
            <p>
              The inventory includes TypeScript, CSS, SCSS, Markdown and MDX. All files also counts
              other file types under src/.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="stats-source-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>02 / INSIDE THE CODEBASE</span>
          <h2 id="stats-source-title">
            Explore the source<span>.</span>
          </h2>
          <p>
            Switch between files and lines, then select a layer or file type to see what it
            contributes.
          </p>
        </div>
        {source ? (
          <>
            <div className={styles.chartSummary}>
              <span>
                <strong>{number(files)}</strong> files in this breakdown
              </span>
              <span>
                <strong>{number(lines)}</strong> non-empty lines
              </span>
              <small>Scanned for this page snapshot</small>
            </div>
            <SourceCodeCharts metrics={source} />
          </>
        ) : (
          <div className={styles.unavailable}>
            <h3>Source breakdown unavailable</h3>
            <p>
              The source files could not be read in this deployment. Runtime measurements are still
              shown above.
            </p>
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="stats-method-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>03 / WHAT THE NUMBERS MEAN</span>
          <h2 id="stats-method-title">
            Different scopes. Clear boundaries<span>.</span>
          </h2>
        </div>
        <div className={styles.methods}>
          <div>
            <span>01</span>
            <h3>Runtime snapshot</h3>
            <p>
              Uptime and Node version come from the process answering this request. They describe
              this process, not every server that may serve the website.
            </p>
          </div>
          <div>
            <span>02</span>
            <h3>Source breakdown</h3>
            <p>
              The charts scan supported code files under src/ for each snapshot. The source
              inventory above is cached per process and also counts Markdown; its scope differs from
              the charts.
            </p>
          </div>
          <div>
            <span>03</span>
            <h3>Repository snapshot</h3>
            <p>
              {stats.code.available
                ? `${stats.code.fileCount.toLocaleString("en")} code files were counted during the build.`
                : "Build-time code metrics are unavailable."}{" "}
              This wider scope includes scripts and the Dockerfile, while excluding dependencies,
              build output and public assets.
            </p>
          </div>
        </div>
        <Link className={styles.caseLink} href="/projects/magic-portfolio">
          <div>
            <span className={styles.eyebrow}>PUT THE NUMBERS IN CONTEXT</span>
            <h3>How Magic Portfolio fits together.</h3>
            <p>Explore the architecture, request flows and deployment decisions.</p>
          </div>
          <HiArrowUpRight aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
