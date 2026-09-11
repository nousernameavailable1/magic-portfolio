"use client";

import type { WallSubmission } from "@/lib/wall";
import { person } from "@/resources";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  HiArrowPath,
  HiArrowUpRight,
  HiChatBubbleLeftRight,
  HiCheck,
  HiHeart,
  HiOutlineHeart,
  HiOutlinePaperAirplane,
  HiOutlineSparkles,
} from "react-icons/hi2";
import styles from "./DesktopWall.module.scss";

const prompts = [
  "What’s on your mind?",
  "What should I build next?",
  "An unpopular opinion you stand by…",
  "Something small that made your day…",
  "One thing this site could do better…",
];

type DesktopWallProps = {
  body: string;
  setBody: (body: string) => void;
  website: string;
  setWebsite: (website: string) => void;
  submissions: WallSubmission[];
  loading: boolean;
  submitting: boolean;
  reactingId: number | null;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onRefresh: () => Promise<void>;
  onReact: (submission: WallSubmission) => Promise<void>;
};

export function DesktopWall({
  body,
  setBody,
  website,
  setWebsite,
  submissions,
  loading,
  submitting,
  reactingId,
  error,
  onSubmit,
  onRefresh,
  onReact,
}: DesktopWallProps) {
  const [sort, setSort] = useState<"recent" | "loved">("recent");
  const [prompt, setPrompt] = useState(0);
  const [sent, setSent] = useState(false);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (wasSubmitting.current && !submitting && !body) setSent(true);
    wasSubmitting.current = submitting;
  }, [submitting, body]);

  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => setSent(false), 3000);
    return () => clearTimeout(timer);
  }, [sent]);

  // Preserve the API's pinned-first order for Recent; keep pins first when sorting by reactions too.
  const messages =
    sort === "recent"
      ? submissions
      : [...submissions].sort(
          (a, b) => Number(b.pinned) - Number(a.pinned) || b.reactionCount - a.reactionCount,
        );

  return (
    <div className={styles.wall}>
      <aside className={styles.sidebar}>
        <form className={styles.composer} onSubmit={onSubmit}>
          <div className={styles.composerTop}>
            <span className={styles.kicker}>LEAVE A TRACE</span>
            <HiOutlinePaperAirplane aria-hidden="true" />
          </div>
          <h2>
            A thought.
            <br />A little hello.
          </h2>
          <p className={styles.intro}>
            Feedback, a question, or something completely out of the blue.
          </p>

          <div className={styles.writingArea}>
            <label htmlFor="desktop-wall-message">Your message</label>
            <textarea
              id="desktop-wall-message"
              placeholder={prompts[prompt]}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
              required
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  if (body.trim() && !submitting) event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className={styles.writingMeta}>
              <span>
                <span className={styles.privacyDot} /> Anonymous
              </span>
              <span className={styles.characterCount}>
                {body.length.toLocaleString()} <span>/ 2,000</span>
              </span>
            </div>
            <div className={styles.meter} aria-hidden="true">
              <span style={{ width: `${body.length / 20}%` }} />
            </div>
          </div>

          <input
            className={styles.honeypot}
            aria-hidden="true"
            tabIndex={-1}
            autoComplete="off"
            name="website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
          <button
            className={styles.send}
            type="submit"
            disabled={!body.trim() || submitting}
            data-sent={sent}
          >
            <span>{submitting ? "Sending…" : sent ? "Message sent" : "Send message"}</span>
            {sent ? <HiCheck aria-hidden="true" /> : <HiArrowUpRight aria-hidden="true" />}
          </button>
          <div className={styles.composerNote}>
            <span>No account. No name required.</span>
            <kbd>Ctrl / ⌘ + Enter</kbd>
          </div>
        </form>
        <button
          className={styles.promptButton}
          type="button"
          onClick={() => setPrompt((current) => (current + 1) % prompts.length)}
        >
          <HiOutlineSparkles aria-hidden="true" /> Need a starting point?{" "}
          <HiArrowPath aria-hidden="true" />
        </button>
        <p className={styles.promptHint} aria-live="polite">
          {prompt > 0 ? prompts[prompt] : "A blank page is a good place to start."}
        </p>
      </aside>

      <section className={styles.feed} aria-labelledby="desktop-wall-feed-title">
        <div className={styles.feedHeading}>
          <div>
            <span className={styles.kicker}>WALL HISTORY</span>
            <h2 id="desktop-wall-feed-title">
              Dropped comments<span>.</span>
            </h2>
          </div>
          <span className={styles.count}>
            {submissions.length.toString().padStart(2, "0")} <span>messages</span>
          </span>
        </div>
        <div className={styles.toolbar}>
          <fieldset className={styles.sort} aria-label="Message order">
            <button
              type="button"
              aria-pressed={sort === "recent"}
              onClick={() => setSort("recent")}
            >
              Recent
            </button>
            <button type="button" aria-pressed={sort === "loved"} onClick={() => setSort("loved")}>
              Most loved
            </button>
          </fieldset>
          <button
            className={styles.refresh}
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            aria-label="Refresh messages"
          >
            <HiArrowPath className={loading ? styles.spinning : undefined} aria-hidden="true" />
            <span>{loading ? "Refreshing" : "Refresh"}</span>
          </button>
        </div>
        {error && <output className={styles.error}>{error} Use Refresh to try again.</output>}
        {loading && !submissions.length && (
          <output className={styles.empty}>Gathering the conversation…</output>
        )}
        {!loading && !error && !submissions.length && (
          <div className={styles.empty}>
            <HiChatBubbleLeftRight aria-hidden="true" />
            <h3>The first word is yours.</h3>
            <p>Leave a message to get things started.</p>
          </div>
        )}
        <div className={styles.messages}>
          {messages.map((message) => (
            <article className={styles.message} key={message.id}>
              <header className={styles.messageHeader}>
                <span className={styles.sender}>
                  <span className={styles.senderMark} aria-hidden="true">
                    ✳
                  </span>{" "}
                  Anonymous
                </span>
                <span className={styles.messageNumber}>
                  {message.pinned ? "PINNED" : `#${String(message.id).padStart(3, "0")}`}
                </span>
              </header>
              <p className={styles.messageBody}>{message.body}</p>
              {message.comment && (
                <div className={styles.reply}>
                  <span className={styles.replyLabel}>
                    <HiChatBubbleLeftRight aria-hidden="true" /> {person.name} <span>replied</span>
                  </span>
                  <p>{message.comment}</p>
                </div>
              )}
              <footer className={styles.messageFooter}>
                <button
                  type="button"
                  className={styles.reaction}
                  aria-label={message.reacted ? "Remove heart reaction" : "Add heart reaction"}
                  aria-pressed={message.reacted}
                  disabled={reactingId === message.id}
                  onClick={() => void onReact(message)}
                >
                  {message.reacted ? (
                    <HiHeart aria-hidden="true" />
                  ) : (
                    <HiOutlineHeart aria-hidden="true" />
                  )}
                  <span>{message.reactionCount}</span>
                  <span className={styles.reactionLabel}>
                    {message.reacted ? "Resonated" : "Resonate"}
                  </span>
                </button>
                <time dateTime={message.publishedAt ?? message.createdAt}>
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                    new Date(message.publishedAt ?? message.createdAt),
                  )}
                </time>
              </footer>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
