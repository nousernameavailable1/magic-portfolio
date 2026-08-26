"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Fade, Flex, Icon, Line, Row, ToggleButton } from "@once-ui-system/core";
import { FaChartColumn } from "react-icons/fa6";
import { HiEllipsisHorizontal, HiOutlineCommandLine, HiXMark } from "react-icons/hi2";

import { about, blog, display, gallery, person, routes, work } from "@/resources";
import styles from "./Header.module.scss";
import { ThemeToggle } from "./ThemeToggle";

type TimeDisplayProps = {
  timeZone: string;
  locale?: string; // Optionally allow locale, defaulting to 'en-GB'
};

const TimeDisplay: React.FC<TimeDisplayProps> = ({ timeZone, locale = "en-GB" }) => {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      const timeString = new Intl.DateTimeFormat(locale, options).format(now);
      setCurrentTime(timeString);
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);

    return () => clearInterval(intervalId);
  }, [timeZone, locale]);

  return <>{currentTime}</>;
};

export default TimeDisplay;

export const Header = () => {
  const pathname = usePathname() ?? "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDialogElement>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const isAdminRoute = pathname.startsWith("/admin");
  const overflowRouteSelected = ["/gallery", "/wall", "/statistics", "/terminal"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  useEffect(() => {
    if (pathname) setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const desktopMedia = window.matchMedia("(min-width: 48.001rem)");
    const menu = mobileMenuRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableItems = () =>
      Array.from(menu?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileMenuOpen(false);
    };
    const handleMenuKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        return;
      }

      if (event.key !== "Tab") return;
      const items = focusableItems();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(
      () => mobileMenuCloseRef.current?.focus({ preventScroll: true }),
      0,
    );
    desktopMedia.addEventListener("change", closeOnDesktop);
    window.addEventListener("keydown", handleMenuKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      desktopMedia.removeEventListener("change", closeOnDesktop);
      window.removeEventListener("keydown", handleMenuKeys);
      if (menu?.contains(document.activeElement)) mobileMenuTriggerRef.current?.focus();
    };
  }, [mobileMenuOpen]);

  const mobileLink = (
    href: string,
    label: string,
    icon: "home" | "person" | "grid" | "book",
    selected: boolean,
  ) => (
    <Link
      className={`${styles.mobileNavItem} ${selected ? styles.mobileNavItemSelected : ""}`}
      href={href}
      aria-current={selected ? "page" : undefined}
    >
      <Icon decorative name={icon} size="m" />
      <span>{label}</span>
    </Link>
  );

  return (
    <>
      <Fade s={{ hide: true }} fillWidth position="fixed" height="80" zIndex={9} />
      {!isAdminRoute && (
        <Fade
          className={styles.mobileBottomFade}
          hide
          s={{ hide: false }}
          fillWidth
          position="fixed"
          bottom="0"
          to="top"
          height={7.5}
          zIndex={9}
        />
      )}
      <Row
        fitHeight
        className={styles.position}
        position="sticky"
        as="header"
        zIndex={9}
        fillWidth
        padding="8"
        horizontal="center"
        data-border="rounded"
        s={{ hide: true }}
      >
        <Row paddingLeft="12" fillWidth vertical="center" textVariant="body-default-s">
          {display.location && <Row s={{ hide: true }}>{person.location}</Row>}
        </Row>
        <Row fillWidth horizontal="center">
          <Row
            background="page"
            border="neutral-alpha-weak"
            radius="m-4"
            shadow="l"
            padding="4"
            horizontal="center"
            zIndex={1}
          >
            <Row gap="4" vertical="center" textVariant="body-default-s" suppressHydrationWarning>
              {routes["/"] && (
                <ToggleButton prefixIcon="home" href="/" selected={pathname === "/"} />
              )}
              <Line background="neutral-alpha-medium" vert maxHeight="24" />
              {routes["/about"] && (
                <>
                  <Row s={{ hide: true }}>
                    <ToggleButton
                      prefixIcon="person"
                      href="/about"
                      label={about.label}
                      selected={pathname === "/about"}
                    />
                  </Row>
                  <Row hide s={{ hide: false }}>
                    <ToggleButton
                      prefixIcon="person"
                      href="/about"
                      selected={pathname === "/about"}
                    />
                  </Row>
                </>
              )}
              {routes["/projects"] && (
                <>
                  <Row s={{ hide: true }}>
                    <ToggleButton
                      prefixIcon="grid"
                      href="/projects"
                      label={work.label}
                      selected={pathname.startsWith("/projects")}
                    />
                  </Row>
                  <Row hide s={{ hide: false }}>
                    <ToggleButton
                      prefixIcon="grid"
                      href="/projects"
                      selected={pathname.startsWith("/projects")}
                    />
                  </Row>
                </>
              )}
              {routes["/blog"] && (
                <>
                  <Row s={{ hide: true }}>
                    <ToggleButton
                      prefixIcon="book"
                      href="/blog"
                      label={blog.label}
                      selected={pathname.startsWith("/blog")}
                    />
                  </Row>
                  <Row hide s={{ hide: false }}>
                    <ToggleButton
                      prefixIcon="book"
                      href="/blog"
                      selected={pathname.startsWith("/blog")}
                    />
                  </Row>
                </>
              )}
              {routes["/gallery"] && (
                <>
                  <Row s={{ hide: true }}>
                    <ToggleButton
                      prefixIcon="gallery"
                      href="/gallery"
                      label={gallery.label}
                      selected={pathname.startsWith("/gallery")}
                    />
                  </Row>
                  <Row hide s={{ hide: false }}>
                    <ToggleButton
                      prefixIcon="gallery"
                      href="/gallery"
                      selected={pathname.startsWith("/gallery")}
                    />
                  </Row>
                </>
              )}
              {routes["/wall"] && (
                <>
                  <Row s={{ hide: true }}>
                    <ToggleButton
                      prefixIcon="stickyNote"
                      href="/wall"
                      label="Wall"
                      selected={pathname === "/wall"}
                    />
                  </Row>
                  <Row hide s={{ hide: false }}>
                    <ToggleButton
                      prefixIcon="stickyNote"
                      href="/wall"
                      selected={pathname === "/wall"}
                    />
                  </Row>
                </>
              )}
              {display.themeSwitcher && (
                <>
                  <Line background="neutral-alpha-medium" vert maxHeight="24" />
                  <ThemeToggle />
                </>
              )}
            </Row>
          </Row>
        </Row>
        <Flex fillWidth horizontal="end" vertical="center">
          <Flex
            paddingRight="12"
            horizontal="end"
            vertical="center"
            textVariant="body-default-s"
            gap="20"
          >
            <Flex s={{ hide: true }}>
              {display.time && <TimeDisplay timeZone={person.location} />}
            </Flex>
          </Flex>
        </Flex>
      </Row>

      {!isAdminRoute && (
        <>
          <button
            aria-label="Close navigation menu"
            className={`${styles.mobileMenuBackdrop} ${
              mobileMenuOpen ? styles.mobileMenuBackdropVisible : ""
            }`}
            onClick={() => setMobileMenuOpen(false)}
            tabIndex={-1}
            type="button"
          />
          <dialog
            aria-hidden={!mobileMenuOpen}
            aria-label="More destinations"
            aria-modal={mobileMenuOpen || undefined}
            className={`${styles.mobileMenuSheet} ${
              mobileMenuOpen ? styles.mobileMenuSheetOpen : ""
            }`}
            id="mobile-site-menu"
            open={mobileMenuOpen}
            ref={mobileMenuRef}
          >
            <div className={styles.mobileMenuHeading}>
              <div>
                <span>Navigate</span>
                <strong>More to explore</strong>
              </div>
              <button
                aria-label="Close navigation menu"
                className={styles.mobileMenuClose}
                onClick={() => setMobileMenuOpen(false)}
                ref={mobileMenuCloseRef}
                type="button"
              >
                <HiXMark aria-hidden="true" />
              </button>
            </div>
            <nav className={styles.mobileMenuGrid} aria-label="Secondary navigation">
              {routes["/gallery"] && (
                <Link
                  className={`${styles.mobileMenuLink} ${
                    pathname.startsWith("/gallery") ? styles.mobileMenuLinkSelected : ""
                  }`}
                  aria-current={pathname.startsWith("/gallery") ? "page" : undefined}
                  href="/gallery"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon decorative name="gallery" size="m" />
                  <span>Gallery</span>
                </Link>
              )}
              {routes["/wall"] && (
                <Link
                  className={`${styles.mobileMenuLink} ${
                    pathname === "/wall" ? styles.mobileMenuLinkSelected : ""
                  }`}
                  aria-current={pathname === "/wall" ? "page" : undefined}
                  href="/wall"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon decorative name="stickyNote" size="m" />
                  <span>Wall</span>
                </Link>
              )}
              {routes["/statistics"] && (
                <Link
                  className={`${styles.mobileMenuLink} ${
                    pathname === "/statistics" ? styles.mobileMenuLinkSelected : ""
                  }`}
                  aria-current={pathname === "/statistics" ? "page" : undefined}
                  href="/statistics"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FaChartColumn aria-hidden="true" />
                  <span>Statistics</span>
                </Link>
              )}
              {routes["/terminal"] && (
                <Link
                  className={`${styles.mobileMenuLink} ${
                    pathname === "/terminal" ? styles.mobileMenuLinkSelected : ""
                  }`}
                  aria-current={pathname === "/terminal" ? "page" : undefined}
                  href="/terminal"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <HiOutlineCommandLine aria-hidden="true" />
                  <span>Terminal</span>
                </Link>
              )}
            </nav>
            {display.themeSwitcher && (
              <div className={styles.mobileThemeRow}>
                <div>
                  <span>Appearance</span>
                  <strong>Switch color theme</strong>
                </div>
                <ThemeToggle />
              </div>
            )}
          </dialog>

          <nav className={styles.mobileNavigation} aria-label="Primary navigation">
            {routes["/"] && mobileLink("/", "Home", "home", pathname === "/")}
            {routes["/about"] && mobileLink("/about", "About", "person", pathname === "/about")}
            {routes["/projects"] &&
              mobileLink("/projects", "Projects", "grid", pathname.startsWith("/projects"))}
            {routes["/blog"] && mobileLink("/blog", "Blog", "book", pathname.startsWith("/blog"))}
            <button
              aria-controls="mobile-site-menu"
              aria-expanded={mobileMenuOpen}
              aria-haspopup="dialog"
              className={`${styles.mobileNavItem} ${
                mobileMenuOpen || overflowRouteSelected ? styles.mobileNavItemSelected : ""
              }`}
              onClick={() => setMobileMenuOpen((open) => !open)}
              ref={mobileMenuTriggerRef}
              type="button"
            >
              <HiEllipsisHorizontal aria-hidden="true" />
              <span>More</span>
            </button>
          </nav>
        </>
      )}
    </>
  );
};
