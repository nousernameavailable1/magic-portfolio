"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminPageHeader } from "./AdminPageHeader";
import styles from "./host-manager.module.scss";

type HostStatus = {
  state: "idle" | "running" | "succeeded" | "failed";
  phase: string;
  updatedAt: string | null;
  output: string;
  logs: string;
  logsError: string | null;
};

export function HostManager() {
  const [status, setStatus] = useState<HostStatus | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const response = await fetch("/api/admin/host", {
        cache: "no-store",
        signal: AbortSignal.timeout(18000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Host unavailable.");
      setStatus(data);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection lost. Retrying automatically.");
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function update() {
    setSending(true);
    try {
      const response = await fetch("/api/admin/host", {
        method: "POST",
        headers: { "X-Host-Action": "update" },
        signal: AbortSignal.timeout(18000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start update.");
      setStatus((previous) =>
        previous ? { ...previous, state: "running", phase: "pull" } : previous,
      );
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Update request interrupted. Checking status automatically.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.host}>
      <AdminPageHeader
        eyebrow="Tools / Infrastructure"
        title="Host"
        description="Read-only container logs and a single action to deploy the latest published image."
      />
      <section className={styles.panel}>
        <h2>Update deployment</h2>
        <p>
          Runs <code>docker compose pull</code>, then <code>docker compose up -d</code> for this
          stack. The site may briefly disconnect while containers restart. Status reconnects
          automatically.
        </p>
        <button
          type="button"
          onClick={update}
          disabled={!status || Boolean(error) || sending || status.state === "running"}
        >
          {sending || status?.state === "running" ? "Updating…" : "Pull latest & deploy"}
        </button>
        <output className={styles.status}>
          {status ? `${status.state} · ${status.phase}` : "Connecting to host…"}
          {status?.updatedAt ? ` · ${new Date(status.updatedAt).toLocaleString()}` : ""}
        </output>
        {error && <p role="alert">{error} Retrying automatically; displayed logs may be stale.</p>}
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll this read-only log. */}
        <pre aria-label="Deployment output" tabIndex={0}>
          {status?.output || "No deployment output yet."}
        </pre>
      </section>
      <section className={styles.panel}>
        <h2>Container logs</h2>
        <p>Last 200 lines per service, capped at 128 KiB. Refreshes every five seconds.</p>
        {status?.logsError && <p role="alert">{status.logsError}</p>}
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll this read-only log. */}
        <pre aria-label="Read-only container logs" tabIndex={0}>
          {status?.logs || "No logs available."}
        </pre>
      </section>
    </div>
  );
}
