import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import styles from "@/components/admin/admin.module.scss";
import { Column, Icon } from "@once-ui-system/core";
import Link from "next/link";

export const metadata = { title: "VPN" };

export default function AdminVpnPage() {
  return (
    <Column fillWidth gap="24">
      <AdminPageHeader
        eyebrow="Tools / Private network"
        title="VPN"
        description="A home for your private network tools."
      />
      <section className={styles.plannedPanel}>
        <div className={styles.plannedIcon}>
          <Icon decorative name="openvpn" size="xl" />
        </div>
        <span className={styles.plannedBadge}>On the roadmap</span>
        <h2>A more private connection.</h2>
        <p>
          VPN management is planned for this workspace. Connection settings and controls will appear
          here when it is ready.
        </p>
        <Link className={styles.quickLink} href="/admin/dashboard">
          Back to dashboard <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </Column>
  );
}
