import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusRefreshButton } from "@/components/admin/StatusRefreshButton";
import styles from "@/components/admin/admin.module.scss";
import { getSiteStatus } from "@/lib/site-status";
import { formatDubaiDateTime, formatDuration } from "@/utils/formatDate";
import { Column, Row, StatusIndicator, Text } from "@once-ui-system/core";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

function StatusCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Column
      className={styles.statusCard}
      fillWidth
      gap="12"
      padding="20"
      background="surface"
      border="neutral-alpha-weak"
      radius="l"
    >
      <Text variant="label-strong-s" onBackground="neutral-weak">
        {title}
      </Text>
      {children}
    </Column>
  );
}

export default async function AdminDashboardPage() {
  const status = await getSiteStatus();
  const database = status.database;
  const github = status.github;

  return (
    <Column fillWidth gap="24">
      <AdminPageHeader
        eyebrow="Overview / Site operations"
        title="Dashboard"
        description="Your portfolio, at a glance. Keep an eye on the people, content, and services behind it."
        actions={<StatusRefreshButton />}
      />
      <div className={styles.metricGrid}>
        <div className={styles.metric}>
          <span>Total visitors</span>
          <strong>{database.available ? database.visitors.total.toLocaleString() : "—"}</strong>
          <small>Across your public site</small>
        </div>
        <div className={styles.metric}>
          <span>Visits today</span>
          <strong>{database.available ? database.visitors.today.toLocaleString() : "—"}</strong>
          <small>Asia/Dubai</small>
        </div>
        <div className={styles.metric}>
          <span>Awaiting review</span>
          <strong>
            {database.available ? database.submissions.pending.toLocaleString() : "—"}
          </strong>
          <small>Wall submissions</small>
        </div>
      </div>
      <div className={styles.quickLinks}>
        <Link className={styles.quickLink} href="/admin/wall">
          Review the wall <span aria-hidden="true">↗</span>
        </Link>
        <Link className={styles.quickLink} href="/admin/notes">
          Open your notebook <span aria-hidden="true">↗</span>
        </Link>
        <Link className={styles.quickLink} href="/admin/text">
          Edit site content <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div className={styles.statusGrid}>
        <StatusCard title="Database">
          <Row gap="8" vertical="center">
            <StatusIndicator
              ariaLabel={database.available ? "Database available" : "Database unavailable"}
              color={database.available ? "green" : "red"}
              size="s"
            />
            <Text variant="heading-strong-m">
              {database.available ? "Available" : "Unavailable"}
            </Text>
          </Row>
          {database.available ? (
            <Text onBackground="neutral-weak">
              {database.submissions.total} wall submissions · {database.submissions.pending} pending
              · {database.submissions.approved} approved
            </Text>
          ) : (
            <Text onBackground="neutral-weak">
              The app could not reach PostgreSQL. Try refreshing after the database is healthy.
            </Text>
          )}
        </StatusCard>

        <StatusCard title="Visitors">
          {database.available ? (
            <Column gap="4">
              <Text variant="heading-strong-m">{database.visitors.total} total visitors</Text>
              <Text onBackground="neutral-weak">
                {database.visitors.today} visits today (Asia/Dubai)
              </Text>
            </Column>
          ) : (
            <Text onBackground="neutral-weak">
              Visitor counts are unavailable while PostgreSQL cannot be reached.
            </Text>
          )}
        </StatusCard>

        <StatusCard title="GitHub">
          <Row gap="8" vertical="center">
            <StatusIndicator
              ariaLabel={github.available ? "GitHub available" : "GitHub unavailable"}
              color={github.available ? "green" : "red"}
              size="s"
            />
            <Text variant="heading-strong-m">
              {github.available ? "Latest main commit" : "Unavailable"}
            </Text>
          </Row>
          {github.available ? (
            <Column gap="4">
              <Text>{github.commit.message}</Text>
              <Text onBackground="neutral-weak">
                {github.commit.sha.slice(0, 7)} · {github.commit.author ?? "Unknown author"} ·{" "}
                {formatDubaiDateTime(github.commit.committedAt)}
              </Text>
              <a
                className={styles.statusLink}
                href={github.commit.url}
                target="_blank"
                rel="noreferrer"
              >
                View commit
              </a>
            </Column>
          ) : (
            <Text onBackground="neutral-weak">
              GitHub could not be reached for {github.repository}.
            </Text>
          )}
        </StatusCard>

        <StatusCard title="Runtime">
          <Column gap="4">
            <Text>Node {status.runtime.nodeVersion}</Text>
            <Text onBackground="neutral-weak">
              {status.runtime.environment} · app process up for{" "}
              {formatDuration(status.runtime.processUptimeSeconds)}
            </Text>
          </Column>
        </StatusCard>

        <StatusCard title="Deployment">
          <Text variant="heading-strong-m">
            {status.runtime.deploymentRevision
              ? status.runtime.deploymentRevision.slice(0, 7)
              : "Revision unavailable"}
          </Text>
          <Text onBackground="neutral-weak">
            {status.runtime.deploymentRevision
              ? "Reported by the running deployment."
              : "No deployment commit SHA was provided by the runtime."}
          </Text>
        </StatusCard>
      </div>

      <Text variant="body-default-s" onBackground="neutral-weak">
        Checked {formatDubaiDateTime(status.checkedAt)} (Asia/Dubai)
      </Text>
    </Column>
  );
}
