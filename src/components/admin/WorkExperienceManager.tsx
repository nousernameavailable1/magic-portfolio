"use client";

import {
  WORK_EXPERIENCE_LIMITS,
  type WorkExperience,
  type WorkExperienceInput,
} from "@/lib/work-experience-data";
import { Button, Input, Text, Textarea, useToast } from "@once-ui-system/core";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import styles from "./work-experience-manager.module.scss";

type WorkExperienceManagerProps = {
  onDirtyChange?: (dirty: boolean) => void;
};

const emptyDraft: WorkExperienceInput = {
  company: "",
  role: "",
  timeframe: "",
  achievements: [""],
};

function toDraft(experience: WorkExperience): WorkExperienceInput {
  return {
    company: experience.company,
    role: experience.role,
    timeframe: experience.timeframe,
    achievements: [...experience.achievements],
  };
}

function createAchievementKeys(count: number) {
  return Array.from({ length: count }, () => crypto.randomUUID());
}

export function WorkExperienceManager({ onDirtyChange }: WorkExperienceManagerProps) {
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkExperienceInput>(emptyDraft);
  const [achievementKeys, setAchievementKeys] = useState(["new-achievement"]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"save" | "delete" | null>(null);
  const { addToast } = useToast();
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const selectedExperience = experiences.find((experience) => experience.id === selectedId) ?? null;
  const creating = selectedId === null;
  const dirty = selectedExperience
    ? JSON.stringify(draft) !== JSON.stringify(toDraft(selectedExperience))
    : JSON.stringify(draft) !== JSON.stringify(emptyDraft);

  const replaceDraft = useCallback((experience: WorkExperience | null) => {
    const nextDraft = experience ? toDraft(experience) : emptyDraft;
    setDraft(nextDraft);
    setAchievementKeys(createAchievementKeys(nextDraft.achievements.length));
  }, []);

  const loadExperiences = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/work-experience", { cache: "no-store" });
      const data = (await response.json()) as {
        experiences?: WorkExperience[];
        error?: string;
      };
      if (!response.ok || !data.experiences) throw new Error(data.error);
      const first = data.experiences[0] ?? null;
      setExperiences(data.experiences);
      setSelectedId(first?.id ?? null);
      replaceDraft(first);
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not load work experience.",
      });
    } finally {
      setLoading(false);
    }
  }, [replaceDraft]);

  useEffect(() => {
    void loadExperiences();
  }, [loadExperiences]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const protectDraft = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, [dirty]);

  const confirmDiscard = () =>
    !dirty || window.confirm("Discard your unsaved work experience changes?");

  const selectExperience = (experience: WorkExperience) => {
    if (busyAction || !confirmDiscard()) return;
    setSelectedId(experience.id);
    replaceDraft(experience);
  };

  const startNew = () => {
    if (busyAction || !confirmDiscard()) return;
    setSelectedId(null);
    replaceDraft(null);
  };

  const updateAchievement = (index: number, value: string) => {
    setDraft((current) => ({
      ...current,
      achievements: current.achievements.map((achievement, achievementIndex) =>
        achievementIndex === index ? value : achievement,
      ),
    }));
  };

  const removeAchievement = (index: number) => {
    setDraft((current) => ({
      ...current,
      achievements: current.achievements.filter(
        (_, achievementIndex) => achievementIndex !== index,
      ),
    }));
    setAchievementKeys((current) =>
      current.filter((_, achievementIndex) => achievementIndex !== index),
    );
  };

  const saveExperience = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyAction("save");
    try {
      const response = await fetch("/api/admin/work-experience", {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creating ? draft : { id: selectedId, ...draft }),
      });
      const data = (await response.json()) as { experience?: WorkExperience; error?: string };
      if (!response.ok || !data.experience) throw new Error(data.error);

      const saved = data.experience;
      setExperiences((current) => {
        if (creating) return [...current, saved];
        return current.map((experience) => (experience.id === saved.id ? saved : experience));
      });
      setSelectedId(saved.id);
      replaceDraft(saved);
      addToastRef.current({
        variant: "success",
        message: creating ? "Work experience added." : "Work experience saved.",
      });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not save work experience.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const deleteExperience = async () => {
    if (
      !selectedExperience ||
      !window.confirm(`Delete “${selectedExperience.company}”? This cannot be undone.`)
    ) {
      return;
    }
    setBusyAction("delete");
    try {
      const response = await fetch(
        `/api/admin/work-experience?id=${encodeURIComponent(selectedExperience.id)}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);

      const selectedIndex = experiences.findIndex(
        (experience) => experience.id === selectedExperience.id,
      );
      const remaining = experiences.filter((experience) => experience.id !== selectedExperience.id);
      const next = remaining[Math.min(selectedIndex, remaining.length - 1)] ?? null;
      setExperiences(remaining);
      setSelectedId(next?.id ?? null);
      replaceDraft(next);
      addToastRef.current({ variant: "success", message: "Work experience deleted." });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not delete work experience.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const validAchievements = draft.achievements.every(
    (achievement) =>
      achievement.trim().length > 0 &&
      achievement.trim().length <= WORK_EXPERIENCE_LIMITS.achievement,
  );
  const canSave = Boolean(
    draft.company.trim() &&
      draft.role.trim() &&
      draft.timeframe.trim() &&
      draft.company.trim().length <= WORK_EXPERIENCE_LIMITS.company &&
      draft.role.trim().length <= WORK_EXPERIENCE_LIMITS.role &&
      draft.timeframe.trim().length <= WORK_EXPERIENCE_LIMITS.timeframe &&
      draft.achievements.length <= WORK_EXPERIENCE_LIMITS.achievements &&
      validAchievements &&
      dirty,
  );

  return (
    <section className={styles.section} aria-labelledby="work-experience-editor-title">
      <div className={styles.sectionHeader}>
        <div>
          <Text id="work-experience-editor-title" variant="heading-strong-l">
            Work experience
          </Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Add, remove, and edit the entry blocks shown on the About page.
          </Text>
        </div>
        <Button disabled={loading || Boolean(busyAction)} onClick={startNew} size="s">
          Add entry
        </Button>
      </div>

      <div className={styles.manager}>
        <aside className={styles.entryPanel} aria-label="Work experience entries">
          <div className={styles.entryPanelHeader}>
            <Text variant="label-strong-m">Entries</Text>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {loading ? "Loading…" : experiences.length}
            </Text>
          </div>
          <div className={styles.entries}>
            {!loading && experiences.length === 0 && (
              <Text
                className={styles.emptyEntries}
                variant="body-default-s"
                onBackground="neutral-weak"
              >
                No entries yet. Add one to get started.
              </Text>
            )}
            {experiences.map((experience) => (
              <button
                aria-current={selectedId === experience.id ? "true" : undefined}
                className={`${styles.entryButton} ${
                  selectedId === experience.id ? styles.selectedEntry : ""
                }`}
                disabled={loading || Boolean(busyAction)}
                key={experience.id}
                onClick={() => selectExperience(experience)}
                type="button"
              >
                <strong>{experience.company}</strong>
                <span>{experience.role}</span>
                <small>{experience.timeframe}</small>
              </button>
            ))}
          </div>
        </aside>

        <form className={styles.editor} onSubmit={saveExperience}>
          <div className={styles.editorHeader}>
            <div>
              <Text variant="heading-strong-m">{creating ? "New entry" : "Edit entry"}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {creating ? "Create another work experience block." : selectedExperience?.company}
              </Text>
            </div>
            {selectedExperience && selectedExperience.images.length > 0 && (
              <span className={styles.mediaBadge}>
                {selectedExperience.images.length} attached image
              </span>
            )}
          </div>

          <div className={styles.primaryFields}>
            <Input
              disabled={loading || Boolean(busyAction)}
              id="work-experience-company"
              label="Company"
              maxLength={WORK_EXPERIENCE_LIMITS.company}
              onChange={(event) =>
                setDraft((current) => ({ ...current, company: event.target.value }))
              }
              placeholder="Company or organization"
              required
              value={draft.company}
            />
            <Input
              disabled={loading || Boolean(busyAction)}
              id="work-experience-timeframe"
              label="Timeframe"
              maxLength={WORK_EXPERIENCE_LIMITS.timeframe}
              onChange={(event) =>
                setDraft((current) => ({ ...current, timeframe: event.target.value }))
              }
              placeholder="2024 – Present"
              required
              value={draft.timeframe}
            />
          </div>
          <Input
            disabled={loading || Boolean(busyAction)}
            id="work-experience-role"
            label="Role"
            maxLength={WORK_EXPERIENCE_LIMITS.role}
            onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
            placeholder="Your role"
            required
            value={draft.role}
          />

          <div className={styles.achievementSection}>
            <div className={styles.achievementHeader}>
              <div>
                <Text variant="label-strong-m">Bullet points</Text>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Each item appears as its own bullet beneath the role.
                </Text>
              </div>
              <Button
                disabled={
                  loading ||
                  Boolean(busyAction) ||
                  draft.achievements.length >= WORK_EXPERIENCE_LIMITS.achievements
                }
                onClick={() => {
                  setDraft((current) => ({
                    ...current,
                    achievements: [...current.achievements, ""],
                  }));
                  setAchievementKeys((current) => [...current, crypto.randomUUID()]);
                }}
                size="s"
                type="button"
                variant="secondary"
              >
                Add bullet
              </Button>
            </div>
            <div className={styles.achievements}>
              {draft.achievements.length === 0 && (
                <Text
                  className={styles.emptyBullets}
                  variant="body-default-s"
                  onBackground="neutral-weak"
                >
                  This entry has no bullet points.
                </Text>
              )}
              {draft.achievements.map((achievement, index) => (
                <div className={styles.achievementRow} key={achievementKeys[index]}>
                  <Textarea
                    characterCount
                    disabled={loading || Boolean(busyAction)}
                    id={`work-experience-achievement-${index}`}
                    label={`Bullet ${index + 1}`}
                    lines={2}
                    maxLength={WORK_EXPERIENCE_LIMITS.achievement}
                    onChange={(event) => updateAchievement(index, event.target.value)}
                    placeholder="What did you do or accomplish?"
                    required
                    resize="vertical"
                    value={achievement}
                  />
                  <Button
                    aria-label={`Remove bullet ${index + 1}`}
                    disabled={loading || Boolean(busyAction)}
                    onClick={() => removeAchievement(index)}
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
                  onClick={() => {
                    if (selectedExperience) replaceDraft(selectedExperience);
                  }}
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
                onClick={() => void deleteExperience()}
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
