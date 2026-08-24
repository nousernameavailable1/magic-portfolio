import styles from "./ai-generated-notice.module.scss";

export function AiGeneratedNotice() {
  return (
    <aside className={styles.notice} role="note">
      <strong>Note</strong>
      <span>All content in this article was generated entirely by AI.</span>
    </aside>
  );
}
