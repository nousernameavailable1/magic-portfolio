"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import styles from "./about.module.scss";

interface TableOfContentsProps {
  structure: { title: string; target?: string; display: boolean; items: string[] }[];
  about: { tableOfContent: { display: boolean; subItems: boolean } };
}

export default function TableOfContents({ structure, about }: TableOfContentsProps) {
  const [active, setActive] = useState("");

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 48.001rem)");
    let frame = 0;
    const measure = () => {
      frame = 0;
      const sections = structure.filter((section) => section.display);
      let current = sections[0]?.title ?? "";
      for (const section of sections) {
        const element = document.getElementById(section.target ?? section.title);
        if (element && element.getBoundingClientRect().top <= 160) current = section.title;
      }
      if (
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4
      ) {
        current = sections[sections.length - 1]?.title ?? current;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    const configure = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.cancelAnimationFrame(frame);
      frame = 0;
      if (desktop.matches) {
        measure();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
      }
    };
    configure();
    desktop.addEventListener("change", configure);
    return () => {
      desktop.removeEventListener("change", configure);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [structure]);

  const scrollTo = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const element = document.getElementById(id);
    if (!element) return;
    event.preventDefault();
    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY - 112,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    // Preserve anchor keyboard behavior without adding headings to the tab order.
    element.setAttribute("tabindex", "-1");
    element.focus({ preventScroll: true });
  };

  if (!about.tableOfContent.display) return null;

  return (
    <nav className={styles.contents} aria-label="On this page">
      <p className={styles.contentsLabel}>On this page</p>
      <ol>
        {structure
          .filter((section) => section.display)
          .map((section, index) => (
            <li key={section.title}>
              <a
                href={`#${encodeURIComponent(section.target ?? section.title)}`}
                onClick={(event) => scrollTo(event, section.target ?? section.title)}
                aria-current={active === section.title ? "location" : undefined}
              >
                <span className={styles.contentsNumber}>{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </a>
              {about.tableOfContent.subItems && section.items.length > 0 && (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>
                      <a
                        href={`#${encodeURIComponent(item)}`}
                        onClick={(event) => scrollTo(event, item)}
                      >
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
      </ol>
    </nav>
  );
}
