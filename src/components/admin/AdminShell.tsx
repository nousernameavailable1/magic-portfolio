"use client";

import { AdminLogoutButton } from "@/components/wall/AdminLogoutButton";
import { Column, Text, ToggleButton } from "@once-ui-system/core";
import { usePathname } from "next/navigation";
import styles from "./admin.module.scss";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={styles.dashboard}>
      <Column
        as="aside"
        className={styles.sidebar}
        background="surface"
        border="neutral-alpha-weak"
        radius="l"
        padding="12"
        gap="16"
      >
        <Text className={styles.sidebarTitle} variant="heading-strong-l">
          Admin
        </Text>
        <Column gap="4">
          <ToggleButton
            aria-label="Wall moderation"
            className={styles.navButton}
            fillWidth
            horizontal="start"
            href="/admin/wall"
            label="Wall moderation"
            prefixIcon="mail"
            selected={pathname === "/admin/wall"}
          />
          <ToggleButton
            aria-label="VPN"
            className={styles.navButton}
            fillWidth
            horizontal="start"
            href="/admin/vpn"
            label="VPN"
            prefixIcon="openvpn"
            selected={pathname === "/admin/vpn"}
          />
          <ToggleButton
            aria-label="Status"
            className={styles.navButton}
            fillWidth
            horizontal="start"
            href="/admin/status"
            label="Status"
            prefixIcon="globe"
            selected={pathname === "/admin/status"}
          />
          <ToggleButton
            aria-label="Text"
            className={styles.navButton}
            fillWidth
            horizontal="start"
            href="/admin/text"
            label="Text"
            prefixIcon="text"
            selected={pathname === "/admin/text"}
          />
        </Column>
        <div className={styles.signOut}>
          <div className={styles.desktopSignOut}>
            <AdminLogoutButton />
          </div>
          <div className={styles.mobileSignOut}>
            <AdminLogoutButton compact />
          </div>
        </div>
      </Column>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
