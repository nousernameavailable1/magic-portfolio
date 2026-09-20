"use client";

import { HostLogBuffer, type HostLogLine } from "@/lib/host-logs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowDown,
  FiArrowUpRight,
  FiCheck,
  FiDownloadCloud,
  FiSearch,
  FiServer,
  FiTerminal,
} from "react-icons/fi";
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

const stateLabels = {
  idle: "Ready to deploy",
  running: "Deployment in progress",
  succeeded: "Deployment completed",
  failed: "Deployment failed",
};

async function responseData(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new Error(
      `Host returned HTTP ${response.status}. Checking the connection again shortly.`,
    );
  }
}

export function HostManager() {
  const [status, setStatus] = useState<HostStatus | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const [actionError, setActionError] = useState("");
  const [sending, setSending] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [lines, setLines] = useState<HostLogLine[]>([]);
  const [service, setService] = useState("all");
  const [search, setSearch] = useState("");
  const [follow, setFollow] = useState(true);
  const [wrap, setWrap] = useState(false);
  const buffer = useRef(new HostLogBuffer());
  const inFlight = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const logViewport = useRef<HTMLElement>(null);
  const outputViewport = useRef<HTMLPreElement>(null);
  const followOutput = useRef(true);

  const refresh = useCallback(async () => {
    if (inFlight.current || submitting.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch("/api/admin/host", {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || "Host unavailable.");
      if (inFlight.current !== controller) return;
      setStatus(data);
      if (!data.logsError) setLines(buffer.current.append(data.logs));
      setCheckedAt(new Date());
      setConnectionError("");
    } catch (cause) {
      if (inFlight.current === controller) {
        setConnectionError(cause instanceof Error ? cause.message : "Connection lost.");
      }
    } finally {
      window.clearTimeout(timeout);
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      window.clearInterval(timer);
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [refresh]);

  const services = useMemo(
    () => Array.from(new Set(lines.map((line) => line.service))).sort(),
    [lines],
  );
  const visibleLines = useMemo(
    () =>
      lines.filter(
        (line) =>
          (service === "all" || line.service === service) &&
          line.text.toLowerCase().includes(search.toLowerCase()),
      ),
    [lines, service, search],
  );

  useEffect(() => {
    if (visibleLines.length && follow && logViewport.current)
      logViewport.current.scrollTop = logViewport.current.scrollHeight;
  }, [follow, visibleLines]);

  useEffect(() => {
    if (status?.output && followOutput.current && outputViewport.current)
      outputViewport.current.scrollTop = outputViewport.current.scrollHeight;
  }, [status?.output]);

  async function update() {
    if (submitting.current || status?.state === "running") return;
    submitting.current = true;
    // A read started before the click must not overwrite the accepted job.
    inFlight.current?.abort();
    inFlight.current = null;
    setSending(true);
    setActionError("");
    try {
      const response = await fetch("/api/admin/host", {
        method: "POST",
        headers: { "X-Host-Action": "update" },
        signal: AbortSignal.timeout(18000),
      });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || "Could not start deployment.");
      followOutput.current = true;
      setStatus((previous) =>
        previous
          ? {
              ...previous,
              state: "running",
              phase: "Queued",
              output: "Deployment accepted. Waiting for Docker Compose…\n",
            }
          : previous,
      );
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Update request interrupted. Check deployment status before retrying.",
      );
    } finally {
      submitting.current = false;
      setSending(false);
      void refresh();
    }
  }

  const deploying = sending || status?.state === "running";
  const phaseLabels: Record<string, string> = {
    Queued: "Deployment queued. Waiting for Docker Compose…",
    pull: "Downloading the latest published images…",
    up: "Restarting services with the downloaded images…",
  };
  const step =
    status?.state === "succeeded"
      ? 3
      : status?.phase.startsWith("up")
        ? 2
        : status?.phase.startsWith("pull")
          ? 1
          : 0;

  return (
    <div className={styles.host}>
      <AdminPageHeader
        eyebrow="Tools / Infrastructure"
        title="Host"
        description="Deploy your latest release and keep an eye on the services behind it."
        actions={
          <a className={styles.siteLink} href="/" target="_blank" rel="noreferrer">
            Visit site <FiArrowUpRight aria-hidden="true" />
          </a>
        }
      />
      <div className={styles.connectionBar}>
        <span className={styles.connection}>
          <span className={styles.dot} data-live={Boolean(status && !connectionError)} />
          {connectionError
            ? "Reconnecting to host"
            : status
              ? "Host connected"
              : "Connecting to host"}
        </span>
        <span>
          Auto-refresh · 5s
          {checkedAt && (
            <>
              {" "}
              <span className={styles.separator}>/</span> Last checked{" "}
              {checkedAt.toLocaleTimeString()}
            </>
          )}
        </span>
      </div>
      {connectionError && (
        <p className={styles.alert} role="alert">
          {connectionError} Retrying automatically. Existing logs are preserved.
        </p>
      )}

      <section className={styles.deployment} aria-labelledby="deployment-title">
        <div className={styles.deployIntro}>
          <div className={styles.sectionLabel}>
            <FiDownloadCloud aria-hidden="true" /> RELEASE MANAGEMENT
          </div>
          <h2 id="deployment-title">Update deployment</h2>
          <p>
            Pull the latest published images, then restart the stack. The site may briefly
            disconnect while services restart.
          </p>
          <button
            className={styles.deployButton}
            type="button"
            onClick={update}
            disabled={!status || deploying}
          >
            <FiDownloadCloud aria-hidden="true" />
            {sending ? "Starting deployment…" : deploying ? "Deploying…" : "Pull latest & deploy"}
          </button>
          <span className={styles.deployHint}>Status reconnects automatically.</span>
        </div>
        <div className={styles.deployDetails}>
          <div className={styles.deploymentHeading}>
            <span className={styles.sectionLabel}>LATEST DEPLOYMENT</span>
            <span className={styles.badge} data-state={status?.state || "idle"}>
              {status ? stateLabels[status.state] : "Connecting"}
            </span>
          </div>
          <ol className={styles.steps} aria-label="Deployment progress">
            {["Pull images", "Restart services", "Complete"].map((label, index) => (
              <li
                key={label}
                data-active={step === index + 1}
                data-complete={step > index + 1 || step === 3}
              >
                <span>
                  {step > index + 1 || step === 3 ? (
                    <FiCheck aria-hidden="true" />
                  ) : (
                    `0${index + 1}`
                  )}
                </span>
                {label}
              </li>
            ))}
          </ol>
          <output className={styles.phase}>
            {status?.state === "idle"
              ? "No deployment has been started from this console."
              : status
                ? phaseLabels[status.phase] || status.phase
                : "Fetching deployment status…"}
          </output>
          {status?.updatedAt && (
            <time className={styles.updatedAt} dateTime={status.updatedAt}>
              Updated {new Date(status.updatedAt).toLocaleString()}
            </time>
          )}
          {actionError && (
            <p className={styles.alert} role="alert">
              {actionError}
            </p>
          )}
        </div>
        <div className={styles.deploymentOutput}>
          <div className={styles.outputHeader}>
            <span>
              <FiTerminal aria-hidden="true" /> Deployment output
            </span>
            <span>Pull + restart transcript</span>
          </div>
          {status?.output ? (
            <pre
              ref={outputViewport}
              className={styles.outputTerminal}
              aria-label="Deployment output"
              // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll command output.
              tabIndex={0}
              onScroll={(event) => {
                const view = event.currentTarget;
                followOutput.current = view.scrollHeight - view.scrollTop - view.clientHeight < 40;
              }}
            >
              {status.output}
            </pre>
          ) : (
            <div className={styles.outputEmpty}>
              <FiTerminal aria-hidden="true" />
              <div>
                <strong>
                  {status?.state === "running"
                    ? "Waiting for command output"
                    : "Your deployment transcript will appear here"}
                </strong>
                <p>
                  Shows image downloads, container restarts and errors from deployments started
                  here. Service activity appears in Container logs below.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className={styles.logsPanel} aria-labelledby="logs-title">
        <div className={styles.logsHeading}>
          <div>
            <div className={styles.sectionLabel}>
              <FiServer aria-hidden="true" /> LIVE OBSERVABILITY
            </div>
            <h2 id="logs-title">Container logs</h2>
            <p>New lines append automatically. Scroll up to read without interruption.</p>
          </div>
          <span
            className={styles.badge}
            data-state={
              connectionError || status?.logsError ? "failed" : status ? "succeeded" : "idle"
            }
          >
            {connectionError || status?.logsError
              ? "Feed interrupted"
              : status
                ? "Live feed"
                : "Connecting"}
          </span>
        </div>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <FiSearch aria-hidden="true" />
            <input
              aria-label="Search logs"
              placeholder="Search logs…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            aria-label="Filter by service"
            value={service}
            onChange={(event) => setService(event.target.value)}
          >
            <option value="all">All services</option>
            {services.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <label className={styles.wrapControl}>
            <input
              type="checkbox"
              checked={wrap}
              onChange={(event) => setWrap(event.target.checked)}
            />
            Wrap lines
          </label>
          <button
            className={styles.followButton}
            type="button"
            aria-pressed={follow}
            onClick={() => setFollow((previous) => !previous)}
          >
            <FiArrowDown aria-hidden="true" />
            {follow ? "Following" : "Follow latest"}
          </button>
        </div>
        {status?.logsError && (
          <p className={styles.logAlert} role="alert">
            {status.logsError} Previously received lines are preserved.
          </p>
        )}
        <section
          className={`${styles.logViewport} ${wrap ? styles.wrapped : ""}`}
          ref={logViewport}
          aria-label="Read-only container logs"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll the read-only log region.
          tabIndex={0}
          onScroll={(event) => {
            const view = event.currentTarget;
            const atBottom = view.scrollHeight - view.scrollTop - view.clientHeight < 40;
            if (!atBottom && follow) setFollow(false);
          }}
        >
          {visibleLines.length ? (
            visibleLines.map((line) => (
              <div className={styles.logLine} key={line.id}>
                <span className={styles.lineNumber} aria-hidden="true">
                  {line.id}
                </span>
                <span className={styles.logText}>
                  <span className={styles.logTime} title={line.timestamp}>
                    {line.timestamp ? `${line.timestamp} ` : ""}
                  </span>
                  <span className={styles.serviceName}>{line.service}</span>
                  <span>{line.message}</span>
                </span>
              </div>
            ))
          ) : (
            <div className={styles.logsEmpty}>
              <FiTerminal aria-hidden="true" />
              <strong>
                {search || service !== "all"
                  ? "No matching log lines"
                  : status
                    ? "Waiting for container activity"
                    : "Connecting to your services…"}
              </strong>
              <span>
                {search || service !== "all"
                  ? "Try another search or service."
                  : "Available logs will appear here automatically."}
              </span>
            </div>
          )}
        </section>
        <footer className={styles.logsFooter}>
          <span>
            {visibleLines.length.toLocaleString()} of {lines.length.toLocaleString()} buffered lines
          </span>
          <span>200 lines / service per poll · Up to 2,000 lines retained</span>
        </footer>
      </section>
    </div>
  );
}
