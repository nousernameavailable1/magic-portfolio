"use client";

import { Button, Input, Row, Text, useToast } from "@once-ui-system/core";
import { useCallback, useEffect, useRef, useState } from "react";

type BypassSettings = {
  suffix: string;
  enabled: boolean;
};

export function WallBypassSettings() {
  const [settings, setSettings] = useState<BypassSettings | null>(null);
  const [suffix, setSuffix] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    void loadSettings();
  }, [loadSettings]);

  const updateSettings = async (update: Partial<BypassSettings>, successMessage: string) => {
    setSaving(true);
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
      setSaving(false);
    }
  };

  const enabled = settings?.enabled ?? false;
  const canSaveSuffix = Boolean(suffix.trim() && suffix.trim() !== settings?.suffix);

  return (
    <Row
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
        aria-label="Bypass suffix"
        id="wall-bypass-suffix"
        placeholder="--bypass"
        value={suffix}
        maxLength={80}
        height="xs"
        disabled={loading || saving}
        onChange={(event) => setSuffix(event.target.value)}
        style={{ minHeight: "2.25rem", width: "8rem" }}
      />
      <Button
        size="s"
        variant="secondary"
        loading={saving}
        disabled={loading || !canSaveSuffix}
        onClick={() => void updateSettings({ suffix }, "Bypass suffix saved.")}
      >
        Save
      </Button>
      <Button
        size="s"
        variant={enabled ? "danger" : "success"}
        loading={saving}
        disabled={loading}
        onClick={() =>
          void updateSettings(
            { enabled: !enabled },
            enabled ? "Instant publishing disabled." : "Instant publishing enabled.",
          )
        }
      >
        {enabled ? "Disable" : "Enable"}
      </Button>
    </Row>
  );
}
