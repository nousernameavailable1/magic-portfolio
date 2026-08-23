import type { Metadata } from "next";
import styles from "./rickroll.module.scss";

export const metadata: Metadata = {
  title: "Rickroll",
  robots: { index: false, follow: false },
};

export default function RickrollPage() {
  return (
    <main className={styles.page}>
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className={styles.video}
        referrerPolicy="strict-origin-when-cross-origin"
        src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&rel=0&playsinline=1"
        title="Never Gonna Give You Up"
      />
    </main>
  );
}
