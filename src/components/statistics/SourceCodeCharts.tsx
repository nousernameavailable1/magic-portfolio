"use client";

import styles from "@/components/projects/magic-portfolio-case-study.module.scss";
import type { PortfolioSourceMetrics } from "@/lib/portfolio-case-study";
import { useState } from "react";

export function SourceCodeCharts({ metrics }: { metrics: PortfolioSourceMetrics }) {
  const [unit, setUnit] = useState<"files" | "lines">("files");
  const [layer, setLayer] = useState(0);
  const [language, setLanguage] = useState(0);
  const [languageUnit, setLanguageUnit] = useState<"files" | "lines">("files");
  const maxLayer = Math.max(...metrics.layers.map((item) => item[unit]), 1);
  const languageTotal = metrics.languages.reduce((sum, item) => sum + item[languageUnit], 0);
  let offset = 0;
  const segments = metrics.languages.map((item, index) => {
    const start = offset;
    offset += (item[languageUnit] / languageTotal) * 100;
    return `var(--chart-${index}) ${start}% ${offset}%`;
  });
  const selectedLanguage = metrics.languages[language];

  if (!selectedLanguage || !languageTotal) return <p>Source breakdown unavailable.</p>;
  return (
    <div className={styles.caseStudy}>
      <div className={styles.charts}>
        <figure className={styles.chart}>
          <figcaption>
            <h3>Where the work lives</h3>
            <div className={styles.segmented} aria-label="Code layer measurement">
              <button
                type="button"
                aria-pressed={unit === "files"}
                onClick={() => setUnit("files")}
              >
                Files
              </button>
              <button
                type="button"
                aria-pressed={unit === "lines"}
                onClick={() => setUnit("lines")}
              >
                Lines
              </button>
            </div>
          </figcaption>
          <div className={styles.bars}>
            {metrics.layers.map((item, index) => (
              <button
                type="button"
                key={item.label}
                aria-pressed={layer === index}
                onClick={() => setLayer(index)}
              >
                <span>
                  {item.label}
                  <strong>{item[unit].toLocaleString("en")}</strong>
                </span>
                <span className={styles.barTrack}>
                  <span style={{ width: `${(item[unit] / maxLayer) * 100}%` }} />
                </span>
              </button>
            ))}
          </div>
          <p className={styles.chartDetail} aria-live="polite">
            {metrics.layers[layer].detail}
          </p>
        </figure>
        <figure className={styles.chart}>
          <figcaption>
            <h3>The material mix</h3>
            <div className={styles.segmented} aria-label="File type measurement">
              <button
                type="button"
                aria-pressed={languageUnit === "files"}
                onClick={() => setLanguageUnit("files")}
              >
                Files
              </button>
              <button
                type="button"
                aria-pressed={languageUnit === "lines"}
                onClick={() => setLanguageUnit("lines")}
              >
                Lines
              </button>
            </div>
          </figcaption>
          <div className={styles.mix}>
            <div
              className={styles.donut}
              style={{ background: `conic-gradient(${segments.join(",")})` }}
              aria-hidden="true"
            >
              <div>
                <strong>
                  {Math.round((selectedLanguage[languageUnit] / languageTotal) * 100)}
                  <small>%</small>
                </strong>
                <span>{selectedLanguage.label}</span>
              </div>
            </div>
            <div className={styles.legend}>
              {metrics.languages.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={language === index}
                  onClick={() => setLanguage(index)}
                >
                  <i style={{ background: `var(--chart-${index})` }} />
                  <span>
                    {item.label}
                    <strong>
                      {item[languageUnit].toLocaleString("en")} {languageUnit} ·{" "}
                      {((item[languageUnit] / languageTotal) * 100).toFixed(1)}%
                    </strong>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <p className={styles.chartDetail} aria-live="polite">
            {selectedLanguage.detail}
          </p>
        </figure>
      </div>
      <p className={styles.method}>
        Method: TypeScript, JavaScript, CSS, SCSS and MDX under src/. Blank lines are excluded;
        comments are included. Dependencies, generated build output and media assets are excluded.
        These are source measurements, not bundle sizes or performance scores.
      </p>
    </div>
  );
}
