"use client";

import { Button, Column, Input, PasswordInput, Text, useToast } from "@once-ui-system/core";
import { type FormEvent, useState } from "react";
import styles from "./AdminLoginForm.module.scss";

export function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      window.location.assign("/admin/wall");
    } catch (error) {
      addToast({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not sign in.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <Column
        className={styles.card}
        fillWidth
        gap="16"
        padding="20"
        background="surface"
        border="neutral-alpha-weak"
        radius="l"
        horizontal="center"
      >
        <Input
          id="admin-username"
          name="username"
          label="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
        />
        <PasswordInput
          id="admin-password"
          name="password"
          label="Admin password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
        <Text
          className={styles.note}
          align="center"
          variant="body-default-s"
          onBackground="neutral-weak"
        >
          This area is private.
        </Text>
        <Button
          className={styles.submitButton}
          type="submit"
          loading={submitting}
          disabled={!username || !password}
        >
          Sign in
        </Button>
      </Column>
    </form>
  );
}
