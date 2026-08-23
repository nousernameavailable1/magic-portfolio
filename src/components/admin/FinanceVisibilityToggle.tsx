"use client";

import { useToast } from "@once-ui-system/core";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./finance-visibility-toggle.module.scss";

export function FinanceVisibilityToggle() {
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const loadSetting = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/finance", { cache: "no-store" });
      const data = (await response.json()) as { visible?: boolean; error?: string };
      if (!response.ok || typeof data.visible !== "boolean") throw new Error(data.error);
      setVisible(data.visible);
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not load Finance visibility.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSetting();
  }, [loadSetting]);

  const toggleVisibility = async () => {
    const nextVisible = !visible;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/finance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: nextVisible }),
      });
      const data = (await response.json()) as { visible?: boolean; error?: string };
      if (!response.ok || typeof data.visible !== "boolean") throw new Error(data.error);

      setVisible(data.visible);
      addToastRef.current({
        variant: "success",
        message: `Finance section ${data.visible ? "shown" : "hidden"}.`,
      });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not update Finance visibility.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      aria-checked={visible}
      aria-label={visible ? "Hide Finance section" : "Show Finance section"}
      className={`${styles.switch} ${visible ? styles.enabled : ""}`}
      disabled={loading || saving}
      onClick={() => void toggleVisibility()}
      role="switch"
      type="button"
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
