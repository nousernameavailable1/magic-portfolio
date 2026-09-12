"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import adminStyles from "@/components/admin/admin.module.scss";
import Link from "next/link";

import type { WallStatus, WallSubmission } from "@/lib/wall";
import { person } from "@/resources";
import { Avatar, Button, Column, Row, Text, Textarea, useToast } from "@once-ui-system/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { WallBypassSettings } from "./WallBypassSettings";
import styles from "./wall.module.scss";

const statuses: Array<{ value: WallStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

type ModerationAction = "approve" | "reject" | "pin" | "move-to-pending" | "clear-likes" | "delete";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function WallModeration() {
  const [status, setStatus] = useState<WallStatus>("pending");
  const [submissions, setSubmissions] = useState<WallSubmission[]>([]);
  const [approvalComments, setApprovalComments] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<{
    id: number;
    action: ModerationAction;
  } | null>(null);
  const { addToast } = useToast();
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const loadSubmissions = useCallback(
    async (nextStatus = status) => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/admin/wall?status=${nextStatus}`, { cache: "no-store" });
        const data = (await response.json()) as { submissions?: WallSubmission[]; error?: string };
        if (!response.ok) throw new Error(data.error);
        setSubmissions(data.submissions ?? []);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not load submissions.");
        addToastRef.current({
          variant: "danger",
          message: error instanceof Error ? error.message : "Could not load submissions.",
        });
      } finally {
        setLoading(false);
      }
    },
    [status],
  );

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const changeStatus = async (
    submission: WallSubmission,
    nextStatus: WallStatus,
    action: ModerationAction,
    comment?: string,
  ) => {
    setBusyAction({ id: submission.id, action });
    try {
      const response = await fetch("/api/admin/wall", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: submission.id,
          status: nextStatus,
          pinned: submission.pinned,
          comment: nextStatus === "approved" ? comment : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      setApprovalComments((current) => ({ ...current, [submission.id]: "" }));
      await loadSubmissions();
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not update this submission.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const togglePin = async (submission: WallSubmission) => {
    setBusyAction({ id: submission.id, action: "pin" });
    try {
      const response = await fetch("/api/admin/wall", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: submission.id,
          status: submission.status,
          pinned: !submission.pinned,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      await loadSubmissions();
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not update this submission.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const remove = async (submission: WallSubmission) => {
    setBusyAction({ id: submission.id, action: "delete" });
    try {
      const response = await fetch(`/api/admin/wall?id=${submission.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      await loadSubmissions();
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not delete this submission.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const clearLikes = async (submission: WallSubmission) => {
    setBusyAction({ id: submission.id, action: "clear-likes" });
    try {
      const response = await fetch(`/api/admin/wall/reactions?id=${submission.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { cleared?: number; error?: string };
      if (!response.ok) throw new Error(data.error);
      await loadSubmissions();
      addToastRef.current({
        variant: "success",
        message: data.cleared ? "Likes cleared." : "This message has no likes.",
      });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not clear likes.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const selectStatus = (nextStatus: WallStatus) => {
    setStatus(nextStatus);
  };

  return (
    <Column className={styles.moderationPage} fillWidth gap="xl" paddingY="24">
      <AdminPageHeader
        eyebrow="Content / Community"
        title="Wall moderation"
        description="Keep the conversation thoughtful. Review messages and curate what appears on your wall."
        actions={
          <Link className={adminStyles.quickLink} href="/wall" target="_blank">
            View wall <span aria-hidden="true">↗</span>
          </Link>
        }
      />
      <div className={styles.moderationToolbar}>
        <Row className={styles.moderationFilters} gap="8" wrap>
          {statuses.map((item) => (
            <Button
              key={item.value}
              aria-pressed={status === item.value}
              variant={status === item.value ? "primary" : "secondary"}
              size="s"
              onClick={() => selectStatus(item.value)}
            >
              {item.label}
            </Button>
          ))}
          <span aria-hidden="true" className={styles.filterDivider} />
          <Button
            className={styles.moderationRefresh}
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
        <WallBypassSettings />
      </div>

      {loadError && (
        <div className={styles.moderationEmpty} role="alert">
          <h2>Could not load the wall.</h2>
          <p>{loadError}</p>
          <Button variant="secondary" onClick={() => void loadSubmissions()}>
            Try again
          </Button>
        </div>
      )}
      {!loading && !loadError && submissions.length === 0 && (
        <div className={styles.moderationEmpty}>
          <span className={styles.emptyMark} aria-hidden="true">
            ✓
          </span>
          <h2>{status === "pending" ? "You’re all caught up." : `No ${status} messages.`}</h2>
          <p>
            {status === "pending"
              ? "New submissions will appear here, ready for your review."
              : "Messages you move to this category will appear here."}
          </p>
        </div>
      )}
      <Column fillWidth gap="12">
        {submissions.map((submission) => {
          const busy = busyAction?.id === submission.id;
          const isBusy = (action: ModerationAction) =>
            busyAction?.id === submission.id && busyAction.action === action;
          const approvalComment = approvalComments[submission.id] ?? "";
          return (
            <Column
              key={submission.id}
              className={styles.submissionCard}
              fillWidth
              gap="16"
              padding="20"
              background="surface"
              border="neutral-alpha-weak"
              radius="l"
            >
              <Column gap="8">
                <Text className={styles.message} variant="body-default-l">
                  {submission.body}
                </Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Submitted {formatDate(submission.createdAt)}
                </Text>
              </Column>
              {status === "pending" && (
                <Column className={styles.commentComposer} gap="8">
                  <Textarea
                    id={`approval-comment-${submission.id}`}
                    label="Comment for the published wall (optional)"
                    placeholder="Add a comment..."
                    value={approvalComment}
                    onChange={(event) =>
                      setApprovalComments((current) => ({
                        ...current,
                        [submission.id]: event.target.value,
                      }))
                    }
                    maxLength={1000}
                    lines={3}
                    characterCount
                    resize="vertical"
                  />
                </Column>
              )}
              {status === "approved" && submission.comment && (
                <Column
                  className={styles.moderationComment}
                  gap="8"
                  padding="12"
                  background="brand-alpha-weak"
                  borderLeft="brand-alpha-medium"
                  radius="s"
                >
                  <Row className={styles.commentHeader} gap="8" vertical="center">
                    <Avatar aria-label={`Comment by ${person.name}`} size="s" src={person.avatar} />
                    <Text className={styles.commentLabel} variant="label-default-s">
                      Comment
                    </Text>
                  </Row>
                  <Text className={styles.comment} variant="body-default-m">
                    {submission.comment}
                  </Text>
                </Column>
              )}
              <Row
                className={styles.moderationActions}
                fillWidth
                horizontal="between"
                vertical="center"
                gap="8"
              >
                <Row className={styles.moderationActionGroup} gap="8" wrap>
                  {submission.status !== "approved" && (
                    <Button
                      size="s"
                      variant="success"
                      loading={isBusy("approve")}
                      disabled={busy}
                      onClick={() =>
                        void changeStatus(submission, "approved", "approve", approvalComment)
                      }
                    >
                      Approve
                    </Button>
                  )}
                  {submission.status === "pending" && (
                    <Button
                      size="s"
                      variant="danger"
                      loading={isBusy("reject")}
                      disabled={busy}
                      onClick={() => void changeStatus(submission, "rejected", "reject")}
                    >
                      Reject
                    </Button>
                  )}
                  {submission.status === "approved" && (
                    <Button
                      size="s"
                      variant="secondary"
                      loading={isBusy("pin")}
                      disabled={busy}
                      onClick={() => void togglePin(submission)}
                    >
                      {submission.pinned ? "Unpin" : "Pin"}
                    </Button>
                  )}
                  {submission.status !== "pending" && (
                    <Button
                      size="s"
                      variant="secondary"
                      loading={isBusy("move-to-pending")}
                      disabled={busy}
                      onClick={() => void changeStatus(submission, "pending", "move-to-pending")}
                    >
                      Move to pending
                    </Button>
                  )}
                  {submission.status === "approved" && (
                    <Text className={styles.moderationLikeCount} variant="label-default-s">
                      <span className={styles.heart}>♥</span>
                      <span className={styles.reactionCount}>{submission.reactionCount}</span>
                    </Text>
                  )}
                  {submission.status === "approved" && (
                    <Button
                      size="s"
                      variant="secondary"
                      loading={isBusy("clear-likes")}
                      disabled={busy || submission.reactionCount === 0}
                      onClick={() => void clearLikes(submission)}
                    >
                      Clear likes
                    </Button>
                  )}
                </Row>
                {submission.status !== "pending" && (
                  <Button
                    className={styles.moderationDelete}
                    size="s"
                    variant="danger"
                    loading={isBusy("delete")}
                    disabled={busy}
                    onClick={() => void remove(submission)}
                  >
                    Delete
                  </Button>
                )}
              </Row>
            </Column>
          );
        })}
      </Column>
    </Column>
  );
}
