"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminLogoutButton } from "@/components/wall/AdminLogoutButton";
import { Icon, Text } from "@once-ui-system/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaChartColumn } from "react-icons/fa6";
import { HiEllipsisHorizontal, HiXMark } from "react-icons/hi2";
import styles from "./admin.module.scss";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin/dashboard";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDialogElement>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const sectionName =
    {
      "/admin/wall": "Wall moderation",
      "/admin/notes": "Notes",
      "/admin/fakemail": "Fakemail",
      "/admin/dashboard": "Dashboard",
      "/admin/text": "Site content",
      "/admin/map": "Site map",
      "/admin/vpn": "VPN",
    }[pathname] ?? "Admin";
  const overflowRouteSelected = ["/admin/fakemail", "/admin/map", "/admin/vpn"].includes(pathname);

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
    icon: "mail" | "email" | "globe" | "stickyNote" | "text",
    selected: boolean,
  ) => (
    <Link
      aria-current={selected ? "page" : undefined}
      className={`${styles.mobileNavItem} ${selected ? styles.mobileNavItemSelected : ""}`}
      href={href}
    >
      <Icon decorative name={icon} size="m" />
      <span>{label}</span>
    </Link>
  );

  return (
    <div className={styles.dashboard} data-admin-site="">
      <a className={styles.skipLink} href="#admin-content">
        Skip to content
      </a>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/admin/dashboard" aria-label="Admin dashboard">
          <span className={styles.brandMark}>
            tk<span>.</span>
          </span>
          <span>
            Talal Kadli<small>CONTROL ROOM</small>
          </span>
        </Link>
        <div className={styles.workspaceLabel}>
          <span /> Personal workspace
        </div>
        <nav className={styles.desktopNav} aria-label="Admin navigation">
          {[
            {
              label: "Overview",
              links: [{ href: "/admin/dashboard", label: "Dashboard", icon: "globe" }],
            },
            {
              label: "Content",
              links: [
                { href: "/admin/wall", label: "Wall moderation", icon: "mail" },
                { href: "/admin/notes", label: "Notes", icon: "stickyNote" },
                { href: "/admin/text", label: "Site content", icon: "text" },
              ],
            },
            {
              label: "Tools & access",
              links: [
                { href: "/admin/fakemail", label: "Fakemail", icon: "email" },
                { href: "/admin/map", label: "Site map", icon: "map" },
                { href: "/admin/vpn", label: "VPN", icon: "openvpn" },
              ],
            },
          ].map((group) => (
            <div className={styles.navGroup} key={group.label}>
              <span className={styles.navLabel}>{group.label}</span>
              {group.links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={`${styles.navButton} ${pathname === item.href ? styles.navSelected : ""}`}
                >
                  <Icon decorative name={item.icon} size="s" />
                  <span>{item.label}</span>
                  {item.href === "/admin/vpn" && <small>Soon</small>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <Link className={styles.siteLink} href="/">
            View public site <span aria-hidden="true">↗</span>
          </Link>
          <div className={styles.account}>
            <span className={styles.accountAvatar}>TK</span>
            <div>
              <strong>Talal Kadli</strong>
              <span>Administrator</span>
            </div>
            <AdminLogoutButton compact />
          </div>
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topBar}>
          <div>
            <span>Workspace</span>
            <span aria-hidden="true">/</span>
            <strong>{sectionName}</strong>
          </div>
          <div>
            <span className={styles.privateLabel}>Private access</span>
            <ThemeToggle />
          </div>
        </header>
        <main className={styles.content} id="admin-content" tabIndex={-1}>
          {children}
        </main>
        <footer className={styles.workspaceFooter}>
          <span>TK / CONTROL ROOM</span>
          <span>Built with intention.</span>
        </footer>
      </div>

      <header className={styles.mobileTopBar}>
        <Link href="/admin/dashboard" aria-label="Admin dashboard">
          <span>TK</span>
          <strong>Admin</strong>
        </Link>
        <Text variant="label-default-s" onBackground="neutral-weak">
          {sectionName}
        </Text>
      </header>

      <button
        aria-label="Close admin menu"
        className={`${styles.mobileMenuBackdrop} ${
          mobileMenuOpen ? styles.mobileMenuBackdropVisible : ""
        }`}
        onClick={() => setMobileMenuOpen(false)}
        tabIndex={-1}
        type="button"
      />
      <dialog
        aria-hidden={!mobileMenuOpen}
        aria-label="More admin destinations"
        aria-modal={mobileMenuOpen || undefined}
        className={`${styles.mobileMenuSheet} ${mobileMenuOpen ? styles.mobileMenuSheetOpen : ""}`}
        id="mobile-admin-menu"
        open={mobileMenuOpen}
        ref={mobileMenuRef}
      >
        <div className={styles.mobileMenuHeading}>
          <div>
            <span>Administration</span>
            <strong>More tools</strong>
          </div>
          <button
            aria-label="Close admin menu"
            className={styles.mobileMenuClose}
            onClick={() => setMobileMenuOpen(false)}
            ref={mobileMenuCloseRef}
            type="button"
          >
            <HiXMark aria-hidden="true" />
          </button>
        </div>
        <nav className={styles.mobileMenuGrid} aria-label="Secondary admin navigation">
          <Link className={styles.mobileMenuLink} href="/" onClick={() => setMobileMenuOpen(false)}>
            <Icon decorative name="home" size="m" />
            <span>View site</span>
          </Link>
          <Link
            aria-current={pathname === "/admin/fakemail" ? "page" : undefined}
            className={`${styles.mobileMenuLink} ${
              pathname === "/admin/fakemail" ? styles.mobileMenuLinkSelected : ""
            }`}
            href="/admin/fakemail"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Icon decorative name="email" size="m" />
            <span>Fakemail</span>
          </Link>
          <Link
            aria-current={pathname === "/admin/map" ? "page" : undefined}
            className={`${styles.mobileMenuLink} ${
              pathname === "/admin/map" ? styles.mobileMenuLinkSelected : ""
            }`}
            href="/admin/map"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Icon decorative name="map" size="m" />
            <span>Site map</span>
          </Link>
          <Link
            aria-current={pathname === "/admin/vpn" ? "page" : undefined}
            className={`${styles.mobileMenuLink} ${
              pathname === "/admin/vpn" ? styles.mobileMenuLinkSelected : ""
            }`}
            href="/admin/vpn"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Icon decorative name="openvpn" size="m" />
            <span>VPN</span>
          </Link>
          <Link
            className={styles.mobileMenuLink}
            href="/statistics"
            onClick={() => setMobileMenuOpen(false)}
          >
            <FaChartColumn aria-hidden="true" />
            <span>Statistics</span>
          </Link>
        </nav>
        <div className={styles.mobileThemeRow}>
          <div>
            <span>Appearance</span>
            <strong>Switch color theme</strong>
          </div>
          <ThemeToggle />
        </div>
        <div className={styles.mobileSessionRow}>
          <div>
            <span>Session</span>
            <strong>Signed in as Talal Kadli</strong>
          </div>
          <AdminLogoutButton />
        </div>
      </dialog>

      <nav className={styles.mobileAdminNav} aria-label="Admin navigation">
        {mobileLink("/admin/wall", "Wall", "mail", pathname === "/admin/wall")}
        {mobileLink("/admin/notes", "Notes", "stickyNote", pathname === "/admin/notes")}
        {mobileLink("/admin/dashboard", "Status", "globe", pathname === "/admin/dashboard")}
        {mobileLink("/admin/text", "Text", "text", pathname === "/admin/text")}
        <button
          aria-controls="mobile-admin-menu"
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
    </div>
  );
}
