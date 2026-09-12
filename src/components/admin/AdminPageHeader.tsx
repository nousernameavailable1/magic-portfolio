import type { ReactNode } from "react";
import styles from "./admin.module.scss";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  id,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageIntro}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1 id={id}>
          {title}
          <span>.</span>
        </h1>
        <p>{description}</p>
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </header>
  );
}
