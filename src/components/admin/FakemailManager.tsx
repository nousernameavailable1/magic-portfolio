"use client";

import {
  Button,
  Column,
  Input,
  Row,
  SegmentedControl,
  Select,
  Text,
  useToast,
} from "@once-ui-system/core";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import styles from "./fakemail-manager.module.scss";

type FakemailAlias = {
  id: string;
  email: string;
  expiresAt: string | null;
  createdAt: string;
};

type FakemailSettings = {
  aliases: FakemailAlias[];
  configured: boolean;
  domain: string;
};

type AliasMode = "custom" | "random";
type Expiration = "1h" | "1d" | "1w" | "never";

const expirationOptions = [
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "1 day" },
  { value: "1w", label: "1 week" },
  { value: "never", label: "Never" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(new Date(value));
}

export function FakemailManager() {
  const [settings, setSettings] = useState<FakemailSettings | null>(null);
  const [mode, setMode] = useState<AliasMode>("random");
  const [localPart, setLocalPart] = useState("");
  const [expiresIn, setExpiresIn] = useState<Expiration>("1d");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"create" | string | null>(null);
  const { addToast } = useToast();
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const loadAliases = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/fakemail", { cache: "no-store" });
      const data = (await response.json()) as Partial<FakemailSettings> & { error?: string };
      if (!response.ok || !data.aliases || typeof data.configured !== "boolean" || !data.domain) {
        throw new Error(data.error);
      }

      setSettings({ aliases: data.aliases, configured: data.configured, domain: data.domain });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not load fakemail aliases.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAliases();
  }, [loadAliases]);

  const createAlias = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyAction("create");
    try {
      const response = await fetch("/api/admin/fakemail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn, localPart, mode }),
      });
      const data = (await response.json()) as { alias?: FakemailAlias; error?: string };
      const alias = data.alias;
      if (!response.ok || !alias) throw new Error(data.error);

      setSettings((current) =>
        current ? { ...current, aliases: [alias, ...current.aliases] } : current,
      );
      setLocalPart("");
      addToastRef.current({ variant: "success", message: `${alias.email} is ready.` });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not create the fakemail alias.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const deleteAlias = async (alias: FakemailAlias) => {
    setBusyAction(alias.id);
    try {
      const response = await fetch(`/api/admin/fakemail?id=${encodeURIComponent(alias.id)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);

      setSettings((current) =>
        current
          ? {
              ...current,
              aliases: current.aliases.filter((candidate) => candidate.id !== alias.id),
            }
          : current,
      );
      addToastRef.current({ variant: "success", message: `${alias.email} deleted.` });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not delete the fakemail alias.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const domain = settings?.domain ?? "kadli.org";
  const isBusy = busyAction !== null;
  const canCreate =
    settings?.configured && !isBusy && (mode === "random" || Boolean(localPart.trim()));

  return (
    <Column className={styles.manager} fillWidth gap="24">
      <form onSubmit={createAlias}>
        <Column
          className={styles.createCard}
          fillWidth
          gap="16"
          padding="20"
          background="surface"
          border="neutral-alpha-weak"
          radius="l"
        >
          <Column gap="4">
            <Text variant="heading-strong-l">Create alias</Text>
            <Text onBackground="neutral-weak">
              Each alias forwards to your verified destination address through Cloudflare.
            </Text>
          </Column>
          {!loading && !settings?.configured && (
            <Text className={styles.configurationError} variant="body-default-s">
              Add the Fakemail environment variables before creating aliases.
            </Text>
          )}
          <div className={styles.modeControl}>
            <SegmentedControl
              buttons={[
                { value: "random", label: "Random alias", type: "button" },
                { value: "custom", label: "Custom alias", type: "button" },
              ]}
              fillWidth
              onToggle={(value) => setMode(value === "custom" ? "custom" : "random")}
              selected={mode}
            />
          </div>
          {mode === "custom" && (
            <Input
              id="fakemail-local-part"
              label="Alias name"
              hasSuffix={<span className={styles.domain}>@{domain}</span>}
              maxLength={64}
              onChange={(event) => setLocalPart(event.target.value)}
              placeholder="newsletter"
              value={localPart}
            />
          )}
          <Select
            id="fakemail-expiry"
            label="Auto-delete"
            onSelect={(value) => {
              if (!Array.isArray(value) && ["1h", "1d", "1w", "never"].includes(value)) {
                setExpiresIn(value as Expiration);
              }
            }}
            options={expirationOptions}
            value={expiresIn}
          />
          <Row className={styles.formActions} gap="8" vertical="center" wrap>
            <Button
              className={styles.createButton}
              disabled={!canCreate}
              loading={busyAction === "create"}
              size="s"
              type="submit"
            >
              {mode === "random" ? "Create random alias" : "Create alias"}
            </Button>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Expiring aliases are removed within five minutes of their scheduled time.
            </Text>
          </Row>
        </Column>
      </form>

      <Column fillWidth gap="12">
        <Row
          className={styles.listHeader}
          fillWidth
          horizontal="between"
          vertical="center"
          gap="12"
          wrap
        >
          <Text variant="heading-strong-l">Active aliases</Text>
          <Button
            disabled={loading || isBusy}
            loading={loading}
            onClick={() => void loadAliases()}
            size="s"
            variant="secondary"
          >
            Refresh
          </Button>
        </Row>
        {!loading && settings?.aliases.length === 0 && (
          <Text onBackground="neutral-weak">No aliases are currently forwarding mail.</Text>
        )}
        {settings?.aliases.map((alias) => (
          <Row
            key={alias.id}
            className={styles.alias}
            fillWidth
            gap="16"
            horizontal="between"
            padding="16"
            vertical="center"
            wrap
          >
            <Column gap="4">
              <code className={styles.address}>{alias.email}</code>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Created {formatDate(alias.createdAt)} ·{" "}
                {alias.expiresAt ? `Expires ${formatDate(alias.expiresAt)}` : "Never expires"}
              </Text>
            </Column>
            <Button
              className={styles.deleteButton}
              disabled={isBusy}
              loading={busyAction === alias.id}
              onClick={() => void deleteAlias(alias)}
              size="s"
              variant="danger"
            >
              Delete
            </Button>
          </Row>
        ))}
      </Column>
    </Column>
  );
}
