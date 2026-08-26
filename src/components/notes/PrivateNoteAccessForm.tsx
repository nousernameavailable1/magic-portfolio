"use client";

import { Button, Column, Heading, PasswordInput, Text } from "@once-ui-system/core";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import styles from "./private-note-access.module.scss";

export function PrivateNoteAccessForm({ slug, enabled }: { slug: string; enabled: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function unlockNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(undefined);

    try {
      const response = await fetch(`/api/notes/${encodeURIComponent(slug)}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Incorrect password.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Could not verify the password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href="/notes">
        ← All notes
      </Link>
      <Column
        className={styles.card}
        fillWidth
        gap="24"
        padding="32"
        background="surface"
        border="brand-alpha-medium"
        radius="xl"
        shadow="l"
      >
        <Column gap="8" horizontal="center" align="center">
          <Text className={styles.eyebrow} variant="label-strong-s">
            PRIVATE NOTE
          </Text>
          <Heading align="center" variant="display-strong-s" wrap="balance">
            This note needs its own password.
          </Heading>
          <Text align="center" onBackground="neutral-weak">
            Page access and note access are separate. Enter the password shared for this note.
          </Text>
        </Column>

        {enabled ? (
          <form className={styles.form} onSubmit={unlockNote}>
            <Column gap="16">
              <PasswordInput
                autoComplete="current-password"
                errorMessage={error}
                id="private-note-password"
                label="Private note password"
                maxLength={128}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                value={password}
              />
              <Button fillWidth loading={submitting} size="l" type="submit">
                Unlock note
              </Button>
            </Column>
          </form>
        ) : (
          <Text className={styles.unavailable} align="center" onBackground="neutral-weak">
            Password access has not been configured for this note yet.
          </Text>
        )}
      </Column>
    </main>
  );
}
