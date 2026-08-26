"use client";

import {
  Button,
  Column,
  Input,
  PasswordInput,
  Row,
  SegmentedControl,
  Text,
  Textarea,
  useToast,
} from "@once-ui-system/core";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { slugify } from "transliteration";
import styles from "./note-manager.module.scss";

type Note = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  public: boolean;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

type NoteDraft = {
  title: string;
  slug: string;
  summary: string;
  body: string;
  public: boolean;
  privatePassword: string;
};

const emptyDraft: NoteDraft = {
  title: "",
  slug: "",
  summary: "",
  body: "",
  public: false,
  privatePassword: "",
};

function toDraft(note: Note): NoteDraft {
  return {
    title: note.title,
    slug: note.slug,
    summary: note.summary ?? "",
    body: note.body,
    public: note.public,
    privatePassword: "",
  };
}

function noteSlug(value: string) {
  return slugify(value, {
    allowedChars: "a-z0-9-",
    lowercase: true,
    separator: "-",
  })
    .replace(/-+/g, "-")
    .slice(0, 180)
    .replace(/-+$/g, "");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(new Date(value));
}

export function NoteManager() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NoteDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"save" | "delete" | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const { addToast } = useToast();
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const selectedNote = notes.find((note) => note.id === selectedId) ?? null;
  const creating = selectedId === null;
  const dirty = selectedNote
    ? JSON.stringify(draft) !== JSON.stringify(toDraft(selectedNote))
    : Object.values(draft).some((value) => Boolean(value));

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/notes", { cache: "no-store" });
      const data = (await response.json()) as { notes?: Note[]; error?: string };
      if (!response.ok || !data.notes) throw new Error(data.error);
      const first = data.notes[0];
      setNotes(data.notes);
      setSelectedId(first?.id ?? null);
      setDraft(first ? toDraft(first) : emptyDraft);
      setSlugTouched(Boolean(data.notes.length));
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not load notes.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const selectNote = (note: Note) => {
    if (busyAction) return;
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    setSelectedId(note.id);
    setDraft(toDraft(note));
    setSlugTouched(true);
  };

  const startNewNote = () => {
    if (busyAction) return;
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    setSelectedId(null);
    setDraft(emptyDraft);
    setSlugTouched(false);
  };

  const updateTitle = (title: string) => {
    setDraft((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : noteSlug(title),
    }));
  };

  const saveNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyAction("save");
    try {
      const response = await fetch("/api/admin/notes", {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creating ? draft : { id: selectedId, ...draft }),
      });
      const data = (await response.json()) as { note?: Note; error?: string };
      if (!response.ok || !data.note) throw new Error(data.error);

      const saved = data.note;
      setNotes((current) => {
        const withoutSaved = current.filter((note) => note.id !== saved.id);
        return [saved, ...withoutSaved];
      });
      setSelectedId(saved.id);
      setDraft(toDraft(saved));
      setSlugTouched(true);
      addToastRef.current({
        variant: "success",
        message: creating ? "Note created." : "Note saved.",
      });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not save this note.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const removeNote = async () => {
    if (
      !selectedNote ||
      !window.confirm(`Delete “${selectedNote.title}”? This cannot be undone.`)
    ) {
      return;
    }
    setBusyAction("delete");
    try {
      const response = await fetch(`/api/admin/notes?id=${encodeURIComponent(selectedNote.id)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);

      const remaining = notes.filter((note) => note.id !== selectedNote.id);
      const next = remaining[0];
      setNotes(remaining);
      setSelectedId(next?.id ?? null);
      setDraft(next ? toDraft(next) : emptyDraft);
      setSlugTouched(Boolean(next));
      addToastRef.current({ variant: "success", message: "Note deleted." });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not delete this note.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const enteredPasswordIsValid =
    !draft.privatePassword ||
    (draft.privatePassword.length >= 8 && draft.privatePassword.length <= 128);
  const privateNoteHasPassword =
    draft.public || Boolean(selectedNote?.hasPassword) || draft.privatePassword.length >= 8;
  const canSave = Boolean(
    draft.title.trim() &&
      draft.slug.trim() &&
      draft.body.trim() &&
      dirty &&
      enteredPasswordIsValid &&
      privateNoteHasPassword,
  );

  return (
    <div className={styles.manager}>
      <aside className={styles.noteList} aria-label="Notes">
        <div className={styles.listHeader}>
          <div>
            <Text variant="heading-strong-l">All notes</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {loading ? "Loading…" : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
            </Text>
          </div>
          <Button disabled={Boolean(busyAction)} onClick={startNewNote} size="s">
            New note
          </Button>
        </div>
        <div className={styles.notes}>
          {!loading && notes.length === 0 && (
            <Text className={styles.emptyList} onBackground="neutral-weak">
              No notes yet. Create your first one.
            </Text>
          )}
          {notes.map((note) => (
            <button
              aria-current={selectedId === note.id ? "true" : undefined}
              className={`${styles.noteItem} ${selectedId === note.id ? styles.selectedNote : ""}`}
              disabled={Boolean(busyAction)}
              key={note.id}
              onClick={() => selectNote(note)}
              type="button"
            >
              <span className={styles.noteItemHeading}>
                <strong>{note.title}</strong>
                <span className={note.public ? styles.publicBadge : styles.privateBadge}>
                  {note.public ? "Public" : note.hasPassword ? "Private" : "Needs password"}
                </span>
              </span>
              <span>{formatDate(note.updatedAt)}</span>
            </button>
          ))}
        </div>
      </aside>

      <form className={styles.editor} onSubmit={saveNote}>
        <div className={styles.editorHeader}>
          <div>
            <Text variant="heading-strong-l">{creating ? "Create note" : "Edit note"}</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {creating
                ? "New notes start private until you choose to publish them."
                : `Last saved ${formatDate(selectedNote?.updatedAt ?? new Date().toISOString())}`}
            </Text>
          </div>
          {selectedNote && (selectedNote.public || selectedNote.hasPassword) && (
            <Link className={styles.viewLink} href={`/notes/${selectedNote.slug}`} target="_blank">
              View note
            </Link>
          )}
        </div>

        <Input
          id="note-title"
          label="Title"
          maxLength={160}
          onChange={(event) => updateTitle(event.target.value)}
          placeholder="A useful thought"
          required
          value={draft.title}
        />
        <Input
          description="Used in the public URL. Changing it changes the note link."
          id="note-slug"
          label="Slug"
          maxLength={180}
          onChange={(event) => {
            setSlugTouched(true);
            setDraft((current) => ({ ...current, slug: noteSlug(event.target.value) }));
          }}
          placeholder="a-useful-thought"
          required
          value={draft.slug}
        />
        <Textarea
          characterCount
          description="Optional text shown on the notes index."
          id="note-summary"
          label="Summary"
          lines={3}
          maxLength={400}
          onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
          placeholder="A short introduction to this note…"
          resize="vertical"
          value={draft.summary}
        />
        <Textarea
          characterCount
          id="note-body"
          label="Note"
          lines={14}
          maxLength={50_000}
          onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
          placeholder="Write your note here…"
          required
          resize="vertical"
          value={draft.body}
        />

        <div className={styles.visibilityField}>
          <div>
            <Text variant="label-strong-s">Note visibility</Text>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              Private notes stay reachable by slug and require their own password. This is
              independent from the overall /notes page access setting.
            </Text>
          </div>
          <SegmentedControl
            buttons={[
              { value: "private", label: "Private", type: "button" },
              { value: "public", label: "Public", type: "button" },
            ]}
            onToggle={(value) =>
              setDraft((current) => ({ ...current, public: value === "public" }))
            }
            selected={draft.public ? "public" : "private"}
          />
        </div>

        {!draft.public && (
          <PasswordInput
            autoComplete="new-password"
            description={
              selectedNote?.hasPassword
                ? "Leave blank to keep the current password, or enter a new one to replace it. Changing it signs out previous visitors."
                : "Required for private notes. Use between 8 and 128 characters."
            }
            id="note-private-password"
            label={selectedNote?.hasPassword ? "Change private password" : "Private note password"}
            maxLength={128}
            minLength={8}
            onChange={(event) =>
              setDraft((current) => ({ ...current, privatePassword: event.target.value }))
            }
            placeholder={
              selectedNote?.hasPassword ? "Keep current password" : "Set access password"
            }
            required={!selectedNote?.hasPassword}
            value={draft.privatePassword}
          />
        )}

        <Row className={styles.editorActions} gap="8" horizontal="between" wrap>
          <Row gap="8" wrap>
            <Button
              disabled={!canSave || Boolean(busyAction)}
              loading={busyAction === "save"}
              type="submit"
            >
              {creating ? "Create note" : "Save changes"}
            </Button>
            {!creating && (
              <Button
                disabled={!dirty || Boolean(busyAction)}
                onClick={() => {
                  if (selectedNote) setDraft(toDraft(selectedNote));
                }}
                type="button"
                variant="secondary"
              >
                Discard changes
              </Button>
            )}
          </Row>
          {!creating && (
            <Button
              disabled={Boolean(busyAction)}
              loading={busyAction === "delete"}
              onClick={() => void removeNote()}
              type="button"
              variant="danger"
            >
              Delete
            </Button>
          )}
        </Row>
      </form>
    </div>
  );
}
