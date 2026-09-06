"use client";

import { STUDY_LIMITS, type StudyEntry, type StudyEntryInput } from "@/lib/about-section-data";
import { Button, Input, Text, Textarea, useToast } from "@once-ui-system/core";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import styles from "./work-experience-manager.module.scss";

type StudyManagerProps = { onDirtyChange?: (dirty: boolean) => void };
const emptyDraft: StudyEntryInput = { name: "", description: "" };

function toDraft(study: StudyEntry): StudyEntryInput {
  return { name: study.name, description: study.description };
}

export function StudyManager({ onDirtyChange }: StudyManagerProps) {
  const [studies, setStudies] = useState<StudyEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StudyEntryInput>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"save" | "delete" | null>(null);
  const { addToast } = useToast();
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const selectedStudy = studies.find((study) => study.id === selectedId) ?? null;
  const creating = selectedId === null;
  const dirty = selectedStudy
    ? JSON.stringify(draft) !== JSON.stringify(toDraft(selectedStudy))
    : JSON.stringify(draft) !== JSON.stringify(emptyDraft);

  const replaceDraft = useCallback((study: StudyEntry | null) => {
    setDraft(study ? toDraft(study) : emptyDraft);
  }, []);

  const loadStudies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/studies", { cache: "no-store" });
      const data = (await response.json()) as { studies?: StudyEntry[]; error?: string };
      if (!response.ok || !data.studies) throw new Error(data.error);
      const first = data.studies[0] ?? null;
      setStudies(data.studies);
      setSelectedId(first?.id ?? null);
      replaceDraft(first);
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not load studies.",
      });
    } finally {
      setLoading(false);
    }
  }, [replaceDraft]);

  useEffect(() => void loadStudies(), [loadStudies]);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const protectDraft = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, [dirty]);

  const confirmDiscard = () => !dirty || window.confirm("Discard your unsaved study changes?");
  const selectStudy = (study: StudyEntry) => {
    if (busyAction || !confirmDiscard()) return;
    setSelectedId(study.id);
    replaceDraft(study);
  };
  const startNew = () => {
    if (busyAction || !confirmDiscard()) return;
    setSelectedId(null);
    replaceDraft(null);
  };

  const saveStudy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyAction("save");
    try {
      const response = await fetch("/api/admin/studies", {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creating ? draft : { id: selectedId, ...draft }),
      });
      const data = (await response.json()) as { study?: StudyEntry; error?: string };
      if (!response.ok || !data.study) throw new Error(data.error);
      const saved = data.study;
      setStudies((current) =>
        creating
          ? [...current, saved]
          : current.map((study) => (study.id === saved.id ? saved : study)),
      );
      setSelectedId(saved.id);
      replaceDraft(saved);
      addToastRef.current({
        variant: "success",
        message: creating ? "Study entry added." : "Study entry saved.",
      });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not save this study.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const deleteStudy = async () => {
    if (
      !selectedStudy ||
      !window.confirm(`Delete “${selectedStudy.name}”? This cannot be undone.`)
    ) {
      return;
    }
    setBusyAction("delete");
    try {
      const response = await fetch(
        `/api/admin/studies?id=${encodeURIComponent(selectedStudy.id)}`,
        {
          method: "DELETE",
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      const selectedIndex = studies.findIndex((study) => study.id === selectedStudy.id);
      const remaining = studies.filter((study) => study.id !== selectedStudy.id);
      const next = remaining[Math.min(selectedIndex, remaining.length - 1)] ?? null;
      setStudies(remaining);
      setSelectedId(next?.id ?? null);
      replaceDraft(next);
      addToastRef.current({ variant: "success", message: "Study entry deleted." });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not delete this study.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const canSave = Boolean(
    draft.name.trim() &&
      draft.description.trim() &&
      draft.name.trim().length <= STUDY_LIMITS.name &&
      draft.description.trim().length <= STUDY_LIMITS.description &&
      dirty,
  );

  return (
    <section className={styles.section} aria-labelledby="studies-editor-title">
      <div className={styles.sectionHeader}>
        <div>
          <Text id="studies-editor-title" variant="heading-strong-l">
            Studies
          </Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Manage each institution and its description on the About page.
          </Text>
        </div>
        <Button disabled={loading || Boolean(busyAction)} onClick={startNew} size="s">
          Add entry
        </Button>
      </div>
      <div className={styles.manager}>
        <aside className={styles.entryPanel} aria-label="Study entries">
          <div className={styles.entryPanelHeader}>
            <Text variant="label-strong-m">Entries</Text>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {loading ? "Loading…" : studies.length}
            </Text>
          </div>
          <div className={styles.entries}>
            {!loading && studies.length === 0 && (
              <Text
                className={styles.emptyEntries}
                variant="body-default-s"
                onBackground="neutral-weak"
              >
                No entries yet. Add one to get started.
              </Text>
            )}
            {studies.map((study) => (
              <button
                aria-current={selectedId === study.id ? "true" : undefined}
                className={`${styles.entryButton} ${selectedId === study.id ? styles.selectedEntry : ""}`}
                disabled={loading || Boolean(busyAction)}
                key={study.id}
                onClick={() => selectStudy(study)}
                type="button"
              >
                <strong>{study.name}</strong>
                <span>{study.description}</span>
              </button>
            ))}
          </div>
        </aside>
        <form className={styles.editor} onSubmit={saveStudy}>
          <div className={styles.editorHeader}>
            <div>
              <Text variant="heading-strong-m">{creating ? "New entry" : "Edit entry"}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {creating ? "Create another study block." : selectedStudy?.name}
              </Text>
            </div>
          </div>
          <Input
            disabled={loading || Boolean(busyAction)}
            id="study-name"
            label="Institution or heading"
            maxLength={STUDY_LIMITS.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Institution name"
            required
            value={draft.name}
          />
          <Textarea
            characterCount
            disabled={loading || Boolean(busyAction)}
            id="study-description"
            label="Description"
            lines={3}
            maxLength={STUDY_LIMITS.description}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="What did you study?"
            required
            resize="vertical"
            value={draft.description}
          />
          <div className={styles.editorActions}>
            <div>
              <Button
                disabled={loading || !canSave || Boolean(busyAction)}
                loading={busyAction === "save"}
                type="submit"
              >
                {creating ? "Create entry" : "Save changes"}
              </Button>
              {!creating && (
                <Button
                  disabled={loading || !dirty || Boolean(busyAction)}
                  onClick={() => selectedStudy && replaceDraft(selectedStudy)}
                  type="button"
                  variant="secondary"
                >
                  Discard changes
                </Button>
              )}
            </div>
            {!creating && (
              <Button
                disabled={loading || Boolean(busyAction)}
                loading={busyAction === "delete"}
                onClick={() => void deleteStudy()}
                type="button"
                variant="danger"
              >
                Delete entry
              </Button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
