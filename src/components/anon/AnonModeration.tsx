"use client";

import { useEffect, useState } from "react";
import { Button, Column, Heading, Row, Text, useToast } from "@once-ui-system/core";
import type { AnonStatus, AnonSubmission } from "@/lib/anon";
import styles from "./anon.module.scss";

const statuses: Array<{ value: AnonStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AnonModeration() {
  const [status, setStatus] = useState<AnonStatus>("pending");
  const [submissions, setSubmissions] = useState<AnonSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const { addToast } = useToast();

  const loadSubmissions = async (nextStatus = status) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/anon?status=${nextStatus}`, { cache: "no-store" });
      const data = await response.json() as { submissions?: AnonSubmission[]; error?: string };
      if (!response.ok) throw new Error(data.error);
      setSubmissions(data.submissions ?? []);
    } catch (error) {
      addToast({ variant: "danger", message: error instanceof Error ? error.message : "Could not load submissions." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubmissions();
  }, [status]);

  const changeStatus = async (submission: AnonSubmission, nextStatus: AnonStatus) => {
    setBusyId(submission.id);
    try {
      const response = await fetch("/api/admin/anon", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: submission.id, status: nextStatus, pinned: submission.pinned }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error);
      await loadSubmissions();
    } catch (error) {
      addToast({ variant: "danger", message: error instanceof Error ? error.message : "Could not update this submission." });
    } finally {
      setBusyId(null);
    }
  };

  const togglePin = async (submission: AnonSubmission) => {
    setBusyId(submission.id);
    try {
      const response = await fetch("/api/admin/anon", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: submission.id, status: submission.status, pinned: !submission.pinned }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error);
      await loadSubmissions();
    } catch (error) {
      addToast({ variant: "danger", message: error instanceof Error ? error.message : "Could not update this submission." });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (submission: AnonSubmission) => {
    setBusyId(submission.id);
    try {
      const response = await fetch(`/api/admin/anon?id=${submission.id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error);
      await loadSubmissions();
    } catch (error) {
      addToast({ variant: "danger", message: error instanceof Error ? error.message : "Could not delete this submission." });
    } finally {
      setBusyId(null);
    }
  };

  const selectStatus = (nextStatus: AnonStatus) => {
    setStatus(nextStatus);
  };

  return (
    <Column fillWidth gap="xl" paddingY="24">
      <Row fillWidth horizontal="between" vertical="center" gap="20" s={{ direction: "column", horizontal: "start", vertical: "start" }}>
        <Column flex={1} gap="8">
          <Heading className={styles.pageTitle} as="h1" variant="display-strong-l">Anonymous submissions</Heading>
          <Text className={styles.pageDescription} onBackground="neutral-weak">Review posts before they appear publicly.</Text>
        </Column>
        <Row gap="8" wrap>
          {statuses.map((item) => (
            <Button key={item.value} variant={status === item.value ? "primary" : "secondary"} size="s" onClick={() => selectStatus(item.value)}>
              {item.label}
            </Button>
          ))}
          <span aria-hidden="true" className={styles.filterDivider} />
          <Button
            size="s"
            variant="secondary"
            style={{
              background: "var(--brand-alpha-medium)",
              borderColor: "var(--brand-border-medium)",
              color: "var(--brand-on-background-strong)",
            }}
            loading={loading}
            onClick={() => void loadSubmissions()}
          >
            Refresh
          </Button>
        </Row>
      </Row>

      {!loading && submissions.length === 0 && <Text onBackground="neutral-weak">No {status} submissions.</Text>}
      <Column fillWidth gap="12">
        {submissions.map((submission) => {
          const busy = busyId === submission.id;
          return (
            <Column key={submission.id} fillWidth gap="16" padding="20" background="surface" border="neutral-alpha-weak" radius="l">
              <Column gap="8">
                <Text className={styles.message} variant="body-default-l">{submission.body}</Text>
                <Text variant="body-default-s" onBackground="neutral-weak">Submitted {formatDate(submission.createdAt)}</Text>
              </Column>
              <Row gap="8" wrap>
                {submission.status !== "approved" && (
                  <Button size="s" variant="success" loading={busy} onClick={() => void changeStatus(submission, "approved")}>Approve</Button>
                )}
                {submission.status !== "rejected" && (
                  <Button size="s" variant="danger" loading={busy} onClick={() => void changeStatus(submission, "rejected")}>Reject</Button>
                )}
                {submission.status === "approved" && (
                  <Button size="s" variant="secondary" loading={busy} onClick={() => void togglePin(submission)}>
                    {submission.pinned ? "Unpin" : "Pin"}
                  </Button>
                )}
                {submission.status !== "pending" && (
                  <Button size="s" variant="secondary" loading={busy} onClick={() => void changeStatus(submission, "pending")}>Move to pending</Button>
                )}
                {status !== "pending" && (
                  <Button size="s" variant="danger" loading={busy} onClick={() => void remove(submission)}>Delete</Button>
                )}
              </Row>
            </Column>
          );
        })}
      </Column>
    </Column>
  );
}
