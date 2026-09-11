import styles from "./public-pages.module.scss";

export function DesktopPageHeading({
  eyebrow,
  title,
  description,
}: { eyebrow: string; title: string; description: string }) {
  return (
    <header className={`${styles.heading} ${title.length > 18 ? styles.longHeading : ""}`}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h1>
        {title.replace(/\.$/, "")}
        <span>.</span>
      </h1>
      <p>{description}</p>
    </header>
  );
}
