"use client";

import {
  TECHNICAL_SKILL_LIMITS,
  type TechnicalSkillEntry,
  type TechnicalSkillInput,
  technicalIconOptions,
} from "@/lib/about-section-data";
import { Button, Icon, Input, Select, Text, Textarea, useToast } from "@once-ui-system/core";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import styles from "./work-experience-manager.module.scss";

type TechnicalSkillsManagerProps = { onDirtyChange?: (dirty: boolean) => void };
const emptyDraft: TechnicalSkillInput = { title: "", description: "", tags: [] };
const iconOptions = technicalIconOptions.map((option) => ({
  ...option,
  hasPrefix: <Icon decorative name={option.value} size="s" />,
}));

function toDraft(skill: TechnicalSkillEntry): TechnicalSkillInput {
  return {
    title: skill.title,
    description: skill.description,
    tags: skill.tags.map((tag) => ({ ...tag })),
  };
}

export function TechnicalSkillsManager({ onDirtyChange }: TechnicalSkillsManagerProps) {
  const [skills, setSkills] = useState<TechnicalSkillEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TechnicalSkillInput>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"save" | "delete" | null>(null);
  const { addToast } = useToast();
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const selectedSkill = skills.find((skill) => skill.id === selectedId) ?? null;
  const creating = selectedId === null;
  const dirty = selectedSkill
    ? JSON.stringify(draft) !== JSON.stringify(toDraft(selectedSkill))
    : JSON.stringify(draft) !== JSON.stringify(emptyDraft);

  const replaceDraft = useCallback((skill: TechnicalSkillEntry | null) => {
    setDraft(skill ? toDraft(skill) : emptyDraft);
  }, []);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/technical-skills", { cache: "no-store" });
      const data = (await response.json()) as { skills?: TechnicalSkillEntry[]; error?: string };
      if (!response.ok || !data.skills) throw new Error(data.error);
      const first = data.skills[0] ?? null;
      setSkills(data.skills);
      setSelectedId(first?.id ?? null);
      replaceDraft(first);
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not load technical skills.",
      });
    } finally {
      setLoading(false);
    }
  }, [replaceDraft]);

  useEffect(() => void loadSkills(), [loadSkills]);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const protectDraft = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, [dirty]);

  const confirmDiscard = () =>
    !dirty || window.confirm("Discard your unsaved technical skill changes?");
  const selectSkill = (skill: TechnicalSkillEntry) => {
    if (busyAction || !confirmDiscard()) return;
    setSelectedId(skill.id);
    replaceDraft(skill);
  };
  const startNew = () => {
    if (busyAction || !confirmDiscard()) return;
    setSelectedId(null);
    replaceDraft(null);
  };

  const updateTag = (id: string, changes: { name?: string; icon?: string }) => {
    setDraft((current) => ({
      ...current,
      tags: current.tags.map((tag) => (tag.id === id ? { ...tag, ...changes } : tag)),
    }));
  };

  const saveSkill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyAction("save");
    try {
      const response = await fetch("/api/admin/technical-skills", {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creating ? draft : { id: selectedId, ...draft }),
      });
      const data = (await response.json()) as { skill?: TechnicalSkillEntry; error?: string };
      if (!response.ok || !data.skill) throw new Error(data.error);
      const saved = data.skill;
      setSkills((current) =>
        creating
          ? [...current, saved]
          : current.map((skill) => (skill.id === saved.id ? saved : skill)),
      );
      setSelectedId(saved.id);
      replaceDraft(saved);
      addToastRef.current({
        variant: "success",
        message: creating ? "Technical skill added." : "Technical skill saved.",
      });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not save this technical skill.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const deleteSkill = async () => {
    if (
      !selectedSkill ||
      !window.confirm(`Delete “${selectedSkill.title}”? This cannot be undone.`)
    ) {
      return;
    }
    setBusyAction("delete");
    try {
      const response = await fetch(
        `/api/admin/technical-skills?id=${encodeURIComponent(selectedSkill.id)}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      const selectedIndex = skills.findIndex((skill) => skill.id === selectedSkill.id);
      const remaining = skills.filter((skill) => skill.id !== selectedSkill.id);
      const next = remaining[Math.min(selectedIndex, remaining.length - 1)] ?? null;
      setSkills(remaining);
      setSelectedId(next?.id ?? null);
      replaceDraft(next);
      addToastRef.current({ variant: "success", message: "Technical skill deleted." });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not delete this technical skill.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const validTags = draft.tags.every(
    (tag) =>
      tag.name.trim().length > 0 &&
      tag.name.trim().length <= TECHNICAL_SKILL_LIMITS.tagName &&
      technicalIconOptions.some((option) => option.value === tag.icon),
  );
  const canSave = Boolean(
    draft.title.trim() &&
      draft.description.trim() &&
      draft.title.trim().length <= TECHNICAL_SKILL_LIMITS.title &&
      draft.description.trim().length <= TECHNICAL_SKILL_LIMITS.description &&
      draft.tags.length <= TECHNICAL_SKILL_LIMITS.tags &&
      validTags &&
      dirty,
  );

  return (
    <section className={styles.section} aria-labelledby="technical-skills-editor-title">
      <div className={styles.sectionHeader}>
        <div>
          <Text id="technical-skills-editor-title" variant="heading-strong-l">
            Technical skills
          </Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Manage skill blocks, tag labels, and their icons without rebuilding the site.
          </Text>
        </div>
        <Button disabled={loading || Boolean(busyAction)} onClick={startNew} size="s">
          Add entry
        </Button>
      </div>
      <div className={styles.manager}>
        <aside className={styles.entryPanel} aria-label="Technical skill entries">
          <div className={styles.entryPanelHeader}>
            <Text variant="label-strong-m">Entries</Text>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {loading ? "Loading…" : skills.length}
            </Text>
          </div>
          <div className={styles.entries}>
            {!loading && skills.length === 0 && (
              <Text
                className={styles.emptyEntries}
                variant="body-default-s"
                onBackground="neutral-weak"
              >
                No entries yet. Add one to get started.
              </Text>
            )}
            {skills.map((skill) => (
              <button
                aria-current={selectedId === skill.id ? "true" : undefined}
                className={`${styles.entryButton} ${selectedId === skill.id ? styles.selectedEntry : ""}`}
                disabled={loading || Boolean(busyAction)}
                key={skill.id}
                onClick={() => selectSkill(skill)}
                type="button"
              >
                <strong>{skill.title}</strong>
                <span>{skill.description}</span>
                <small>
                  {skill.tags.length} {skill.tags.length === 1 ? "tag" : "tags"}
                </small>
              </button>
            ))}
          </div>
        </aside>
        <form className={styles.editor} onSubmit={saveSkill}>
          <div className={styles.editorHeader}>
            <div>
              <Text variant="heading-strong-m">{creating ? "New entry" : "Edit entry"}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {creating ? "Create another technical skill block." : selectedSkill?.title}
              </Text>
            </div>
            {selectedSkill && selectedSkill.images.length > 0 && (
              <span className={styles.mediaBadge}>
                {selectedSkill.images.length} attached{" "}
                {selectedSkill.images.length === 1 ? "image" : "images"}
              </span>
            )}
          </div>
          <Input
            disabled={loading || Boolean(busyAction)}
            id="technical-skill-title"
            label="Skill heading"
            maxLength={TECHNICAL_SKILL_LIMITS.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Technical skill"
            required
            value={draft.title}
          />
          <Textarea
            characterCount
            disabled={loading || Boolean(busyAction)}
            id="technical-skill-description"
            label="Description"
            lines={4}
            maxLength={TECHNICAL_SKILL_LIMITS.description}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Describe this skill"
            required
            resize="vertical"
            value={draft.description}
          />
          <div className={styles.achievementSection}>
            <div className={styles.achievementHeader}>
              <div>
                <Text variant="label-strong-m">Icon tags</Text>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Change the label or choose any icon already included with the site.
                </Text>
              </div>
              <Button
                disabled={
                  loading || Boolean(busyAction) || draft.tags.length >= TECHNICAL_SKILL_LIMITS.tags
                }
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    tags: [
                      ...current.tags,
                      { id: crypto.randomUUID(), name: "", icon: "javascript" },
                    ],
                  }))
                }
                size="s"
                type="button"
                variant="secondary"
              >
                Add tag
              </Button>
            </div>
            <div className={styles.achievements}>
              {draft.tags.length === 0 && (
                <Text
                  className={styles.emptyBullets}
                  variant="body-default-s"
                  onBackground="neutral-weak"
                >
                  This skill has no icon tags.
                </Text>
              )}
              {draft.tags.map((tag, index) => (
                <div className={styles.tagRow} key={tag.id}>
                  <Input
                    disabled={loading || Boolean(busyAction)}
                    id={`technical-skill-tag-name-${tag.id}`}
                    label={`Tag ${index + 1}`}
                    maxLength={TECHNICAL_SKILL_LIMITS.tagName}
                    onChange={(event) => updateTag(tag.id, { name: event.target.value })}
                    placeholder="Tag label"
                    required
                    value={tag.name}
                  />
                  <Select
                    aria-label={`Icon for ${tag.name || `tag ${index + 1}`}`}
                    disabled={loading || Boolean(busyAction)}
                    id={`technical-skill-tag-icon-${tag.id}`}
                    label="Icon"
                    onSelect={(value) =>
                      !Array.isArray(value) && updateTag(tag.id, { icon: value })
                    }
                    options={iconOptions}
                    placement="bottom-end"
                    searchable
                    value={tag.icon}
                  />
                  <Button
                    aria-label={`Remove tag ${tag.name || index + 1}`}
                    disabled={loading || Boolean(busyAction)}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        tags: current.tags.filter((item) => item.id !== tag.id),
                      }))
                    }
                    size="s"
                    type="button"
                    variant="secondary"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
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
                  onClick={() => selectedSkill && replaceDraft(selectedSkill)}
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
                onClick={() => void deleteSkill()}
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
