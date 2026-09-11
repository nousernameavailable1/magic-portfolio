"use client";

import { Button, Column, Heading, PasswordInput, Text } from "@once-ui-system/core";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { HiArrowLeft, HiOutlineLockClosed } from "react-icons/hi2";
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
    <Column
      as="main"
      className={styles.page}
      data-desktop-access
      fillWidth
      paddingY="104"
      horizontal="center"
    >
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
          <span className={styles.desktopEyebrow}>
            <span /> INVITATION ONLY
          </span>
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
            Don&apos;t have access? Womp womp.
          </Text>
          <Link className={styles.homeLink} href="/">
            <HiArrowLeft aria-hidden="true" /> Back to home
          </Link>
        </Column>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formHeading}>
            <span className={styles.lockIcon}>
              <HiOutlineLockClosed aria-hidden="true" />
            </span>
            <h2>This page is intentionally restricted</h2>
            <p>Enter the access password to continue.</p>
          </div>
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
      </Column>
    </Column>
  );
}
