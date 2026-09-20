"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  RANDOM_MESSAGE_LIMITS,
  type RandomMessage,
  type RandomMessageCategory,
  type RandomMessageInput,
  randomMessageCategories,
} from "@/lib/random-message-data";
import { formatDubaiDateTime } from "@/utils/formatDate";
import {
  Button,
  Input,
  SegmentedControl,
  Select,
  Text,
  Textarea,
  useToast,
} from "@once-ui-system/core";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./random-message-manager.module.scss";

type MessageDraft = RandomMessageInput & { source: string };
type CategoryFilter = RandomMessageCategory | "all";

const categoryLabels: Record<RandomMessageCategory, string> = {
  quote: "Quote",
  fact: "Did you know?",
  joke: "Joke",
  prompt: "Prompt",
  other: "Other",
};

const emptyDraft: MessageDraft = { body: "", category: "quote", source: "", active: true };

function toDraft(message: RandomMessage): MessageDraft {
  return {
    body: message.body,
    category: message.category,
    source: message.source ?? "",
    active: message.active,
  };
}

export function RandomMessageManager() {
  const [messages, setMessages] = useState<RandomMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MessageDraft>(emptyDraft);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [preview, setPreview] = useState<RandomMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"save" | "delete" | null>(null);
  const { addToast } = useToast();
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const selectedMessage = messages.find((message) => message.id === selectedId) ?? null;
  const creating = selectedId === null;
  const dirty = selectedMessage
    ? JSON.stringify(draft) !== JSON.stringify(toDraft(selectedMessage))
    : JSON.stringify(draft) !== JSON.stringify(emptyDraft);

  const filteredMessages = useMemo(() => {
    const query = search.trim().toLowerCase();
    return messages.filter(
      (message) =>
        (categoryFilter === "all" || message.category === categoryFilter) &&
        (!query || `${message.body} ${message.source ?? ""}`.toLowerCase().includes(query)),
    );
  }, [categoryFilter, messages, search]);

  const activeMessages = messages.filter((message) => message.active);
  const activeCategoryCount = new Set(activeMessages.map((message) => message.category)).size;

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/admin/messages", { cache: "no-store" });
      const data = (await response.json()) as { messages?: RandomMessage[]; error?: string };
      if (!response.ok || !data.messages) throw new Error(data.error);
      const first = data.messages[0] ?? null;
      setMessages(data.messages);
      setSelectedId(first?.id ?? null);
      setDraft(first ? toDraft(first) : emptyDraft);
      setPreview(data.messages.find((message) => message.active) ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load the message pool.";
      setLoadError(message);
      addToastRef.current({ variant: "danger", message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void loadMessages(), [loadMessages]);
  useEffect(() => {
    if (!dirty) return;
    const protectDraft = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, [dirty]);

  const confirmDiscard = () => !dirty || window.confirm("Discard your unsaved message changes?");

  const selectMessage = (message: RandomMessage) => {
    if (busyAction || !confirmDiscard()) return;
    setSelectedId(message.id);
    setDraft(toDraft(message));
  };

  const startNew = () => {
    if (busyAction || !confirmDiscard()) return;
    setSelectedId(null);
    setDraft(emptyDraft);
  };

  const shufflePreview = () => {
    const candidates = activeMessages.filter(
      (message) => categoryFilter === "all" || message.category === categoryFilter,
    );
    if (candidates.length === 0) {
      setPreview(null);
      return;
    }
    const alternatives = candidates.filter((message) => message.id !== preview?.id);
    const pool = alternatives.length ? alternatives : candidates;
    setPreview(pool[Math.floor(Math.random() * pool.length)]);
  };

  const saveMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyAction("save");
    try {
      const response = await fetch("/api/admin/messages", {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creating ? draft : { id: selectedId, ...draft }),
      });
      const data = (await response.json()) as { message?: RandomMessage; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error);

      const saved = data.message;
      setMessages((current) => {
        const withoutSaved = current.filter((message) => message.id !== saved.id);
        return [saved, ...withoutSaved];
      });
      setSelectedId(saved.id);
      setDraft(toDraft(saved));
      if (saved.active) setPreview(saved);
      addToastRef.current({
        variant: "success",
        message: creating ? "Message added to the pool." : "Message saved.",
      });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not save this message.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const removeMessage = async () => {
    if (!selectedMessage || !window.confirm("Delete this message? This cannot be undone.")) return;
    setBusyAction("delete");
    try {
      const response = await fetch(
        `/api/admin/messages?id=${encodeURIComponent(selectedMessage.id)}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);

      const remaining = messages.filter((message) => message.id !== selectedMessage.id);
      const next = remaining[0] ?? null;
      setMessages(remaining);
      setSelectedId(next?.id ?? null);
      setDraft(next ? toDraft(next) : emptyDraft);
      if (preview?.id === selectedMessage.id) {
        setPreview(remaining.find((message) => message.active) ?? null);
      }
      addToastRef.current({ variant: "success", message: "Message deleted." });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not delete this message.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const canSave = Boolean(
    draft.body.trim() &&
      draft.body.trim().length <= RANDOM_MESSAGE_LIMITS.body &&
      draft.source.trim().length <= RANDOM_MESSAGE_LIMITS.source &&
      dirty,
  );

  const categoryOptions = randomMessageCategories.map((category) => ({
    value: category,
    label: categoryLabels[category],
  }));

  return (
    <div className={styles.page}>
      <AdminPageHeader
        eyebrow="Content / Shared copy"
        title="Random message pool"
        description="Keep quotes, did-you-knows, fun facts, jokes, and prompts in one reusable collection."
        actions={
          <Button disabled={loading || Boolean(busyAction)} onClick={startNew}>
            Add message
          </Button>
        }
      />

      <section className={styles.overview} aria-label="Message pool overview">
        <div className={styles.metrics}>
          <div>
            <span>Total messages</span>
            <strong>{loading ? "—" : messages.length.toLocaleString()}</strong>
          </div>
          <div>
            <span>Active</span>
            <strong>{loading ? "—" : activeMessages.length.toLocaleString()}</strong>
          </div>
          <div>
            <span>Categories in use</span>
            <strong>{loading ? "—" : activeCategoryCount}</strong>
          </div>
        </div>
        <div className={styles.previewCard}>
          <div className={styles.previewHeading}>
            <span>Live pool preview</span>
            <Button
              disabled={loading || activeMessages.length === 0}
              onClick={shufflePreview}
              size="s"
              variant="secondary"
            >
              Shuffle
            </Button>
          </div>
          {preview ? (
            <blockquote>
              <p>{preview.body}</p>
              <footer>
                <span>{categoryLabels[preview.category]}</span>
                {preview.source && <cite>{preview.source}</cite>}
              </footer>
            </blockquote>
          ) : (
            <Text variant="body-default-s" onBackground="neutral-weak">
              Add and activate a message to preview the pool.
            </Text>
          )}
        </div>
      </section>

      <div className={styles.manager}>
        <aside className={styles.messageList} aria-label="Message pool entries">
          <div className={styles.listHeader}>
            <div>
              <Text variant="heading-strong-l">Pool entries</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {loading
                  ? "Loading…"
                  : loadError
                    ? "Unavailable"
                    : `${filteredMessages.length} shown`}
              </Text>
            </div>
          </div>
          <div className={styles.filters}>
            <label htmlFor="message-search">Search messages</label>
            <input
              id="message-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search the pool…"
              type="search"
              value={search}
            />
            <Select
              id="message-category-filter"
              label="Category"
              onSelect={(value) => {
                if (
                  !Array.isArray(value) &&
                  (value === "all" ||
                    randomMessageCategories.includes(value as RandomMessageCategory))
                ) {
                  setCategoryFilter(value as CategoryFilter);
                }
              }}
              options={[{ value: "all", label: "All categories" }, ...categoryOptions]}
              value={categoryFilter}
            />
          </div>
          <div className={styles.entries}>
            {!loading && filteredMessages.length === 0 && (
              <Text
                className={styles.emptyList}
                variant="body-default-s"
                onBackground="neutral-weak"
              >
                {messages.length
                  ? "No messages match these filters."
                  : "No messages yet. Add the first one."}
              </Text>
            )}
            {filteredMessages.map((message) => (
              <button
                aria-current={selectedId === message.id ? "true" : undefined}
                className={`${styles.messageItem} ${selectedId === message.id ? styles.selectedMessage : ""}`}
                disabled={Boolean(busyAction)}
                key={message.id}
                onClick={() => selectMessage(message)}
                type="button"
              >
                <span className={styles.itemMeta}>
                  <span>{categoryLabels[message.category]}</span>
                  <span className={message.active ? styles.activeState : styles.pausedState}>
                    {message.active ? "Active" : "Paused"}
                  </span>
                </span>
                <strong>{message.body}</strong>
                <small>
                  {message.source || `Updated ${formatDubaiDateTime(message.updatedAt)}`}
                </small>
              </button>
            ))}
          </div>
        </aside>

        <form className={styles.editor} onSubmit={saveMessage}>
          <div className={styles.editorHeader}>
            <div>
              <Text variant="heading-strong-l">{creating ? "New message" : "Edit message"}</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {creating
                  ? "Add another reusable line to the pool."
                  : `Last saved ${formatDubaiDateTime(selectedMessage?.updatedAt ?? new Date().toISOString())}`}
              </Text>
            </div>
          </div>

          <Textarea
            characterCount
            disabled={loading || Boolean(busyAction)}
            id="random-message-body"
            label="Message"
            lines={8}
            maxLength={RANDOM_MESSAGE_LIMITS.body}
            onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
            placeholder="Write a quote, fact, joke, or prompt…"
            required
            resize="vertical"
            value={draft.body}
          />
          <div className={styles.fieldGrid}>
            <Select
              id="random-message-category"
              label="Category"
              onSelect={(value) => {
                if (
                  !Array.isArray(value) &&
                  randomMessageCategories.includes(value as RandomMessageCategory)
                ) {
                  setDraft((current) => ({ ...current, category: value as RandomMessageCategory }));
                }
              }}
              options={categoryOptions}
              value={draft.category}
            />
            <Input
              description="Optional attribution or context."
              disabled={loading || Boolean(busyAction)}
              id="random-message-source"
              label="Source"
              maxLength={RANDOM_MESSAGE_LIMITS.source}
              onChange={(event) =>
                setDraft((current) => ({ ...current, source: event.target.value }))
              }
              placeholder="Author, book, or URL"
              value={draft.source}
            />
          </div>

          <div className={styles.availabilityField}>
            <div>
              <Text variant="label-strong-s">Pool availability</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                Paused messages stay saved but are excluded whenever the site draws at random.
              </Text>
            </div>
            <SegmentedControl
              buttons={[
                { value: "paused", label: "Paused", type: "button" },
                { value: "active", label: "Active", type: "button" },
              ]}
              onToggle={(value) =>
                setDraft((current) => ({ ...current, active: value === "active" }))
              }
              selected={draft.active ? "active" : "paused"}
            />
          </div>

          <div className={styles.editorActions}>
            <div>
              <Button
                disabled={loading || !canSave || Boolean(busyAction)}
                loading={busyAction === "save"}
                type="submit"
              >
                {creating ? "Add to pool" : "Save changes"}
              </Button>
              {!creating && (
                <Button
                  disabled={!dirty || Boolean(busyAction)}
                  onClick={() => selectedMessage && setDraft(toDraft(selectedMessage))}
                  type="button"
                  variant="secondary"
                >
                  Discard changes
                </Button>
              )}
            </div>
            {!creating && (
              <Button
                disabled={Boolean(busyAction)}
                loading={busyAction === "delete"}
                onClick={() => void removeMessage()}
                type="button"
                variant="danger"
              >
                Delete message
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
