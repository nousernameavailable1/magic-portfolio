"use client";

import { Button, Column, Heading, PasswordInput, Text } from "@once-ui-system/core";
import { type FormEvent, useState } from "react";
import styles from "./PageAccessForm.module.scss";

type PageAccessFormProps = {
  returnTo: string;
};

export function PageAccessForm({ returnTo }: PageAccessFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "Incorrect password");
        return;
      }

      window.location.assign(returnTo);
    } catch {
      setError("Could not verify the password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Column as="main" className={styles.page} fillWidth paddingY="104" horizontal="center">
      <Column
        className={styles.card}
        fillWidth
        maxWidth="s"
        gap="32"
        padding="32"
        background="surface"
        border="brand-alpha-medium"
        radius="xl"
        shadow="l"
      >
        <Column className={styles.intro} gap="12" horizontal="center" align="center">
          <Text aria-hidden="true" className={styles.mobileEyebrow} variant="label-strong-s">
            PRIVATE ROUTE
          </Text>
          <Heading
            className={styles.title}
            align="center"
            variant="display-strong-m"
            wrap="balance"
          >
            This page is for invited eyes only.
          </Heading>
          <Text
            className={styles.description}
            align="center"
            variant="body-default-l"
            onBackground="neutral-weak"
          >
            Enter the access password to continue.
          </Text>
        </Column>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Column fillWidth gap="16" horizontal="center">
            <PasswordInput
              id="password"
              label="Access password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              errorMessage={error}
              autoComplete="current-password"
              required
            />
            <Button
              className={styles.submitButton}
              type="submit"
              fillWidth
              size="l"
              loading={submitting}
            >
              Unlock page
            </Button>
          </Column>
        </form>
        <Text
          className={styles.note}
          align="center"
          variant="body-default-s"
          onBackground="neutral-weak"
        >
          Don&apos;t have access? Womp womp.
        </Text>
      </Column>
    </Column>
  );
}
