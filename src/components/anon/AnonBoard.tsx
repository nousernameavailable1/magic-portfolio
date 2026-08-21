"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button, Column, Heading, Row, Text, Textarea, useToast } from "@once-ui-system/core";
import type { AnonSubmission } from "@/lib/anon";
import styles from "./anon.module.scss";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export function AnonBoard() {
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [submissions, setSubmissions] = useState<AnonSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const didLoadInitially = useRef(false);
  const { addToast } = useToast();

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/anon", { cache: "no-store" });
      const data = await response.json() as { submissions?: AnonSubmission[]; error?: string };
      if (!response.ok) throw new Error(data.error);
      setSubmissions(data.submissions ?? []);
    } catch (error) {
      addToast({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not load the feed.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didLoadInitially.current) return;
    didLoadInitially.current = true;
    void loadSubmissions();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/anon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, website }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error);
      setBody("");
      setWebsite("");
      addToast({ variant: "success", message: "Sent. It will appear here after review." });
    } catch (error) {
      addToast({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not send your submission.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Column className={styles.board} maxWidth="m" fillWidth gap="xl" paddingY="32">
      <Row className={styles.hero} fillWidth gap="24" vertical="end" s={{ direction: "column", vertical: "start" }}>
        <Column flex={1} gap="12">
          <Text className={styles.eyebrow} variant="label-default-s">ANON / MESSAGE WALL</Text>
          <Heading as="h1" variant="display-strong-l">Say it anonymously.</Heading>
          <Text variant="heading-default-l" onBackground="neutral-weak">
            A feedback, a thought, an insult or complement, or literally anything else
          </Text>
        </Column>
        <Column className={styles.heroNote} gap="4">
          <Text variant="label-default-s" onBackground="brand-strong">COMPLETELY ANONYMOUS (MOSTLY)</Text>
          <Text variant="body-default-s" onBackground="neutral-weak">Messages are moderated to keep things civilized.</Text>
        </Column>
      </Row>

      <form onSubmit={submit}>
        <Column className={styles.composer} fillWidth gap="20" padding="24" background="surface" border="brand-alpha-medium" radius="l" shadow="l">
          <Row fillWidth horizontal="between" vertical="end" gap="12" s={{ direction: "column", horizontal: "start", vertical: "start" }}>
            <Column gap="4">
              <Heading as="h2" variant="heading-strong-l">Drop a message</Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">Say whatever, feel free to rant or ragebait. You can name yourself if you want.</Text>
            </Column>
            <Text className={styles.composerMark} variant="label-default-s">ANONYMOUS</Text>
          </Row>
          <Textarea
            id="anon-message"
            label="Your message"
            placeholder="What&apos;s on your mind?"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            lines={6}
            characterCount
            required
            resize="vertical"
          />
          <input
            aria-hidden="true"
            autoComplete="off"
            className={styles.honeypot}
            name="website"
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            value={website}
          />
          <Row fillWidth horizontal="between" vertical="center" gap="12" s={{ direction: "column", horizontal: "start", vertical: "start" }}>
            <Text variant="body-default-s" onBackground="neutral-weak">
              No account required. Your message is submitted without a name.
            </Text>
            <Button type="submit" loading={submitting} disabled={!body.trim()} variant="primary" size="l">
              Send message
            </Button>
          </Row>
        </Column>
      </form>

      <Column className={styles.feed} fillWidth gap="16">
        <Row className={styles.feedHeader} fillWidth horizontal="between" vertical="center" gap="16" s={{ direction: "column", horizontal: "start", vertical: "start" }}>
          <Row gap="12" vertical="center">
            <Heading as="h2" variant="display-strong-s">Published messages</Heading>
            <Text className={styles.messageCount} variant="label-default-s">{submissions.length}</Text>
          </Row>
          <Button className={styles.refreshButton} variant="secondary" size="s" onClick={() => void loadSubmissions()} loading={loading}>Refresh</Button>
        </Row>
        {!loading && submissions.length === 0 && (
          <Column className={styles.emptyState} fillWidth gap="8" padding="24" background="surface" border="neutral-alpha-weak" radius="l">
            <Heading as="h3" variant="heading-strong-l">The wall is quiet.</Heading>
            <Text onBackground="neutral-weak">Be the first to leave a message.</Text>
          </Column>
        )}
        <Column fillWidth gap="12">
          {submissions.map((submission) => (
            <Column key={submission.id} className={styles.messageCard} fillWidth gap="16" padding="24" background="surface" border="neutral-alpha-weak" radius="l">
              <Text className={styles.message} variant="body-default-l">{submission.body}</Text>
              <Row className={styles.messageMeta} fillWidth horizontal="between" vertical="center" gap="12">
                <Text variant="label-default-s" onBackground="brand-strong">ANONYMOUS</Text>
                <Text variant="body-default-s" onBackground="neutral-weak">{formatDate(submission.publishedAt ?? submission.createdAt)}</Text>
              </Row>
            </Column>
          ))}
        </Column>
      </Column>
    </Column>
  );
}
