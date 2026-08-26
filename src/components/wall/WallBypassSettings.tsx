"use client";

import { Button, Input, Row, Text, useToast } from "@once-ui-system/core";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./wall.module.scss";

type BypassSettings = {
  suffix: string;
  enabled: boolean;
};

type BypassAction = "save-suffix" | "toggle";

export function WallBypassSettings() {
  const [settings, setSettings] = useState<BypassSettings | null>(null);
  const [suffix, setSuffix] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<BypassAction | null>(null);
  const { addToast } = useToast();
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/wall/bypass", { cache: "no-store" });
      const data = (await response.json()) as { settings?: BypassSettings; error?: string };
      if (!response.ok || !data.settings) throw new Error(data.error);

      setSettings(data.settings);
      setSuffix(data.settings.suffix);
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not load bypass settings.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setHydrated(true);
    void loadSettings();
  }, [loadSettings]);

  const updateSettings = async (
    update: Partial<BypassSettings>,
    action: BypassAction,
    successMessage: string,
  ) => {
    setSavingAction(action);
    try {
      const response = await fetch("/api/admin/wall/bypass", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = (await response.json()) as { settings?: BypassSettings; error?: string };
      if (!response.ok || !data.settings) throw new Error(data.error);

      setSettings(data.settings);
      setSuffix(data.settings.suffix);
      addToastRef.current({ variant: "success", message: successMessage });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not update bypass settings.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  const enabled = settings?.enabled ?? false;
  const canSaveSuffix = Boolean(suffix.trim() && suffix.trim() !== settings?.suffix);
  const saving = savingAction !== null;
  const controlsDisabled = !hydrated || loading || saving;

  return (
    <Row
      className={styles.bypassSettings}
      gap="8"
      vertical="center"
      wrap
      paddingX="8"
      background="surface"
      border="neutral-alpha-weak"
      radius="l"
    >
      <Text variant="label-default-s" onBackground="neutral-weak">
        Bypass
      </Text>
      <Input
        className={styles.bypassInput}
        aria-label="Bypass suffix"
        id="wall-bypass-suffix"
        placeholder="--bypass"
        value={suffix}
        maxLength={80}
        height="xs"
        disabled={controlsDisabled}
        onChange={(event) => setSuffix(event.target.value)}
        style={{ minHeight: "2.25rem", width: "8rem" }}
      />
      <Button
        className={styles.bypassSave}
        size="s"
        variant="secondary"
        loading={savingAction === "save-suffix"}
        disabled={controlsDisabled || !canSaveSuffix}
        onClick={() => void updateSettings({ suffix }, "save-suffix", "Bypass suffix saved.")}
      >
        Save
      </Button>
      <Button
        className={styles.bypassToggle}
        size="s"
        variant={enabled ? "danger" : "success"}
        loading={savingAction === "toggle"}
        disabled={controlsDisabled}
        onClick={() =>
          void updateSettings(
            { enabled: !enabled },
            "toggle",
            enabled ? "Instant publishing disabled." : "Instant publishing enabled.",
          )
        }
      >
        {enabled ? "Disable" : "Enable"}
      </Button>
    </Row>
  );
}
