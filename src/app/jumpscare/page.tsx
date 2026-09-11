import type { Metadata } from "next";
import Link from "next/link";
import styles from "./jumpscare.module.scss";

export const metadata: Metadata = {
  title: "Jumpscare",
  robots: { index: false, follow: false },
};

export default function JumpscarePage() {
  return (
    <main className={styles.page}>
      <section className={styles.scare} aria-label="Jumpscare">
        <img alt="" className={styles.face} src="/images/jumpscare.png" />
        <Link className={styles.exit} href="/">
          ← Back home
        </Link>
      </section>
    </main>
  );
}
