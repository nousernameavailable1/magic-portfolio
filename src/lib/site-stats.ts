import "server-only";

import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".scss", ".css", ".md", ".mdx"]);

type SourceMetrics = {
  available: boolean;
  directoryCount: number;
  fileCount: number;
  nonEmptyLineCount: number;
  totalFileCount: number;
};

type CodeMetrics = {
  available: boolean;
  fileCount: number;
  nonEmptyLineCount: number;
};

let sourceMetricsPromise: Promise<SourceMetrics> | undefined;
let codeMetricsPromise: Promise<CodeMetrics> | undefined;

async function collectSourceMetrics(directory: string): Promise<SourceMetrics> {
  const entries = await readdir(directory, { withFileTypes: true });
  let directoryCount = 0;
  let fileCount = 0;
  let nonEmptyLineCount = 0;
  let totalFileCount = 0;

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      const nestedMetrics = await collectSourceMetrics(path);
      directoryCount += nestedMetrics.directoryCount + 1;
      fileCount += nestedMetrics.fileCount;
      nonEmptyLineCount += nestedMetrics.nonEmptyLineCount;
      totalFileCount += nestedMetrics.totalFileCount;
      continue;
    }

    if (!entry.isFile()) continue;

    totalFileCount += 1;
    if (!SOURCE_EXTENSIONS.has(extname(entry.name))) continue;

    const file = await readFile(path, "utf8");
    fileCount += 1;
    nonEmptyLineCount += file.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  }

  return { available: true, directoryCount, fileCount, nonEmptyLineCount, totalFileCount };
}

async function getSourceMetrics() {
  sourceMetricsPromise ??= collectSourceMetrics(join(process.cwd(), "src")).catch(() => ({
    available: false,
    directoryCount: 0,
    fileCount: 0,
    nonEmptyLineCount: 0,
    totalFileCount: 0,
  }));

  return sourceMetricsPromise;
}

async function getCodeMetrics() {
  codeMetricsPromise ??= readFile(join(process.cwd(), "public", "site-code-metrics.json"), "utf8")
    .then((file) => JSON.parse(file) as Omit<CodeMetrics, "available">)
    .then((metrics) => ({ ...metrics, available: true }))
    .catch(() => ({ available: false, fileCount: 0, nonEmptyLineCount: 0 }));

  return codeMetricsPromise;
}

export async function getPublicSiteStats() {
  const processUptimeSeconds = Math.floor(process.uptime());
  const [code, source] = await Promise.all([getCodeMetrics(), getSourceMetrics()]);

  return {
    checkedAt: new Date(),
    processUptimeSeconds,
    startedAt: new Date(Date.now() - processUptimeSeconds * 1_000),
    nodeVersion: process.version.replace(/^v/, ""),
    code,
    source,
  };
}
