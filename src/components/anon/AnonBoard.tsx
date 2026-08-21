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
    <Column maxWidth="m" fillWidth gap="xl" paddingY="24">
      <Column gap="12" maxWidth="s">
        <Heading as="h1" variant="display-strong-l">Say it anonymously.</Heading>
        <Text variant="heading-default-l" onBackground="neutral-weak">
          Feedback, a thought, or a confession—shared without a name.
        </Text>
      </Column>

      <form onSubmit={submit}>
        <Column fillWidth gap="12" padding="20" background="surface" border="neutral-alpha-weak" radius="l">
          <Textarea
            id="anon-message"
            label="What&apos;s on your mind?"
            placeholder="Write freely, but don&apos;t include names, contact details, or anything sensitive."
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            lines={7}
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
              No account required. Submissions are moderated before publishing.
            </Text>
            <Button type="submit" loading={submitting} disabled={!body.trim()} variant="primary">
              Send anonymously
            </Button>
          </Row>
        </Column>
      </form>

      <Column fillWidth gap="16">
        <Row fillWidth horizontal="between" vertical="center">
          <Heading as="h2" variant="display-strong-s">Published thoughts</Heading>
          <Button variant="ghost" size="s" onClick={() => void loadSubmissions()} loading={loading}>Refresh</Button>
        </Row>
        {!loading && submissions.length === 0 && (
          <Text onBackground="neutral-weak">Nothing has been published yet.</Text>
        )}
        <Column fillWidth gap="12">
          {submissions.map((submission) => (
            <Column key={submission.id} fillWidth gap="8" padding="20" background="surface" border="neutral-alpha-weak" radius="l">
              <Text className={styles.message} variant="body-default-l">{submission.body}</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Anonymous · {formatDate(submission.publishedAt ?? submission.createdAt)}
              </Text>
            </Column>
          ))}
        </Column>
      </Column>
    </Column>
  );
}
