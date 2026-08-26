import { getPublicNotes } from "@/lib/notes";
import { baseURL } from "@/resources";
import { Meta } from "@once-ui-system/core";
import Link from "next/link";
import styles from "./notes.module.scss";

export const dynamic = "force-dynamic";

const title = "Notes";
const description = "Short ideas, observations, and things worth keeping.";

export function generateMetadata() {
  return Meta.generate({
    title,
    description,
    baseURL,
    path: "/notes",
    image: `/api/og/generate?title=${encodeURIComponent(title)}`,
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Asia/Dubai",
  }).format(new Date(value));
}

export default async function NotesPage() {
  const notes = await getPublicNotes();

  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <span className={styles.eyebrow}>Notebook</span>
        <h1>Notes</h1>
        <p>{description}</p>
      </header>

      <section className={styles.notes} aria-label="Published notes">
        {notes.length === 0 ? (
          <p className={styles.empty}>No public notes yet.</p>
        ) : (
          notes.map((note) => (
            <Link className={styles.noteCard} href={`/notes/${note.slug}`} key={note.id}>
              <span className={styles.cardHeading}>
                <h2>{note.title}</h2>
                <time dateTime={note.publishedAt ?? note.updatedAt}>
                  {formatDate(note.publishedAt ?? note.updatedAt)}
                </time>
              </span>
              {note.summary && <p>{note.summary}</p>}
              <span className={styles.readMore}>Read note →</span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
