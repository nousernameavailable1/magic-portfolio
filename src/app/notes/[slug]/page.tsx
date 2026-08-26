import { PrivateNoteAccessForm } from "@/components/notes/PrivateNoteAccessForm";
import { getNoteSessionCookieName, isValidNoteSession } from "@/lib/note-auth";
import { getNoteAccessRecordBySlug, getNoteBySlug } from "@/lib/notes";
import { baseURL } from "@/resources";
import { Meta } from "@once-ui-system/core";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "../notes.module.scss";

export const dynamic = "force-dynamic";

type NotePageProps = { params: Promise<{ slug: string }> };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "Asia/Dubai",
  }).format(new Date(value));
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const access = await getNoteAccessRecordBySlug(slug);
  if (!access) return {};
  const session = (await cookies()).get(getNoteSessionCookieName(access.id))?.value;
  const canRead = access.public || isValidNoteSession(session, access.id, access.passwordHash);
  if (!canRead) {
    return {
      title: "Private note",
      description: "This note requires its own access password.",
      robots: { index: false, follow: false },
    };
  }
  const note = await getNoteBySlug(slug);
  if (!note) return {};

  return {
    ...Meta.generate({
      title: note.title,
      description: note.summary ?? `A note titled ${note.title}.`,
      baseURL,
      path: `/notes/${note.slug}`,
      image: `/api/og/generate?title=${encodeURIComponent(note.title)}`,
    }),
    ...(note.public ? {} : { robots: { index: false, follow: false } }),
  };
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params;
  const access = await getNoteAccessRecordBySlug(slug);
  if (!access) notFound();
  if (!access.public) {
    const session = (await cookies()).get(getNoteSessionCookieName(access.id))?.value;
    if (!isValidNoteSession(session, access.id, access.passwordHash)) {
      return <PrivateNoteAccessForm enabled={Boolean(access.passwordHash)} slug={access.slug} />;
    }
  }
  const note = await getNoteBySlug(slug);
  if (!note) notFound();

  const displayDate = note.publishedAt ?? note.updatedAt;

  return (
    <main className={styles.detailPage}>
      <Link className={styles.backLink} href="/notes">
        ← All notes
      </Link>
      <article>
        <header className={styles.noteHeader}>
          <span className={styles.eyebrow}>Note</span>
          <h1>{note.title}</h1>
          {note.summary && <p>{note.summary}</p>}
          <time className={styles.noteMeta} dateTime={displayDate}>
            {note.public ? "Published" : "Updated"} {formatDate(displayDate)}
          </time>
        </header>
        <div className={styles.noteBody}>{note.body}</div>
      </article>
    </main>
  );
}
