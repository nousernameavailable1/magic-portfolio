"use client";

import { AdminLogoutButton } from "@/components/anon/AdminLogoutButton";
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
        <Text variant="heading-strong-l">Admin</Text>
        <Column gap="4">
          <ToggleButton
            fillWidth
            horizontal="start"
            href="/admin/anon"
            label="Anon moderation"
            prefixIcon="mail"
            selected={pathname === "/admin/anon"}
          />
          <ToggleButton
            fillWidth
            horizontal="start"
            href="/admin/vpn"
            label="VPN"
            prefixIcon="openvpn"
            selected={pathname === "/admin/vpn"}
          />
        </Column>
        <div className={styles.signOut}>
          <AdminLogoutButton />
        </div>
      </Column>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
