"use client";

import { Button, Column, PasswordInput, Text, useToast } from "@once-ui-system/core";
import { type FormEvent, useState } from "react";

export function AdminLoginForm() {
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
        body: JSON.stringify({ password }),
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
    <form onSubmit={submit} style={{ width: "100%" }}>
      <Column
        fillWidth
        gap="16"
        padding="20"
        background="surface"
        border="neutral-alpha-weak"
        radius="l"
        horizontal="center"
      >
        <PasswordInput
          id="admin-password"
          label="Admin password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
        <Text align="center" variant="body-default-s" onBackground="neutral-weak">
          This area is private.
        </Text>
        <Button type="submit" loading={submitting} disabled={!password}>
          Sign in
        </Button>
      </Column>
    </form>
  );
}
