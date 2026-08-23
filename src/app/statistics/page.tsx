import { formatDuration, getPublicSiteStats } from "@/lib/site-stats";
import { Column, Heading, Row, Text } from "@once-ui-system/core";
import type { Metadata } from "next";
import styles from "./statistics.module.scss";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Statistics",
  description: "Live statistics for Talal Kadli's portfolio.",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(date);
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Column
      fillWidth
      gap="12"
      padding="20"
      background="surface"
      border="neutral-alpha-weak"
      radius="l"
    >
      <Text variant="label-strong-s" onBackground="neutral-weak">
        {label}
      </Text>
      <Text variant="heading-strong-l">{value}</Text>
      <Text variant="body-default-s" onBackground="neutral-weak">
        {detail}
      </Text>
    </Column>
  );
}

export default async function StatsPage() {
  const stats = await getPublicSiteStats();
  const sourceDetail = stats.source.available
    ? "TypeScript, styles, and MDX files under src."
    : "Source metrics are unavailable in this deployment.";
  const codeLines = stats.code.available
    ? `${stats.code.nonEmptyLineCount.toLocaleString()} lines of code`
    : "Unavailable";
  const sourceFiles = stats.source.available
    ? stats.source.fileCount.toLocaleString()
    : "Unavailable";
  const totalFiles = stats.source.available
    ? stats.source.totalFileCount.toLocaleString()
    : "Unavailable";
  const folders = stats.source.available
    ? stats.source.directoryCount.toLocaleString()
    : "Unavailable";

  return (
    <Column maxWidth="l" fillWidth gap="24" paddingY="24">
      <Column gap="8">
        <Heading as="h1" variant="display-strong-l">
          Statistics
        </Heading>
        <Text variant="heading-default-l" onBackground="neutral-weak">
          A live snapshot of this portfolio's runtime and codebase.
        </Text>
      </Column>

      <div className={styles.statsGrid}>
        <StatCard
          label="Uptime"
          value={formatDuration(stats.processUptimeSeconds)}
          detail={`Running since ${formatDate(stats.startedAt)} (Asia/Dubai).`}
        />
        <StatCard
          label="Codebase"
          value={codeLines}
          detail={
            stats.code.available
              ? `Non-empty lines across ${stats.code.fileCount.toLocaleString()} code files in this repository.`
              : "Code metrics are unavailable in this deployment."
          }
        />
        <Column
          className={styles.structureCard}
          fillWidth
          gap="12"
          padding="20"
          background="surface"
          border="neutral-alpha-weak"
          radius="l"
        >
          <Column gap="12">
            <Text variant="label-strong-s" onBackground="neutral-weak">
              Source files
            </Text>
            <Text variant="heading-strong-l">{sourceFiles}</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {sourceDetail}
            </Text>
          </Column>
          <Row className={styles.structureMetrics} gap="16" vertical="center">
            <Column gap="2">
              <Text variant="label-strong-s">{totalFiles}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                total files
              </Text>
            </Column>
            <Column gap="2">
              <Text variant="label-strong-s">{folders}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                directories
              </Text>
            </Column>
          </Row>
        </Column>
        <StatCard
          label="Runtime"
          value={`Node ${stats.nodeVersion}`}
          detail="Reported by the active server process."
        />
      </div>

      <Row>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Updated {formatDate(stats.checkedAt)} (Asia/Dubai)
        </Text>
      </Row>
    </Column>
  );
}
