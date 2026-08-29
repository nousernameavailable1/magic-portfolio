import "server-only";

import { database } from "./database";

const DEFAULT_GITHUB_REPOSITORY = "nousernameavailable1/magic-portfolio";

type GitHubCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
  author: {
    login: string;
  } | null;
};

type DatabaseStatus =
  | {
      available: true;
      submissions: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
      };
      visitors: {
        total: number;
        today: number;
      };
    }
  | {
      available: false;
    };

type GitHubStatus =
  | {
      available: true;
      repository: string;
      commit: {
        sha: string;
        url: string;
        message: string;
        author: string | null;
        committedAt: Date;
      };
    }
  | {
      available: false;
      repository: string;
    };

export type SiteStatus = {
  checkedAt: Date;
  database: DatabaseStatus;
  github: GitHubStatus;
  runtime: {
    environment: string;
    nodeVersion: string;
    processUptimeSeconds: number;
    deploymentRevision: string | null;
  };
};

function getGitHubRepository() {
  const repository = process.env.GITHUB_REPOSITORY ?? DEFAULT_GITHUB_REPOSITORY;
  return /^[\w.-]+\/[\w.-]+$/.test(repository) ? repository : DEFAULT_GITHUB_REPOSITORY;
}

async function getDatabaseStatus(): Promise<DatabaseStatus> {
  try {
    const db = await database();
    const result = await db.query<{
      total: string;
      pending: string;
      approved: string;
      rejected: string;
      visitors_total: string;
      visits_today: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM wall_submissions) AS total,
        (SELECT COUNT(*) FROM wall_submissions WHERE status = 'pending') AS pending,
        (SELECT COUNT(*) FROM wall_submissions WHERE status = 'approved') AS approved,
        (SELECT COUNT(*) FROM wall_submissions WHERE status = 'rejected') AS rejected,
        (SELECT COUNT(*) FROM site_visitors) AS visitors_total,
        (
          SELECT COUNT(*)
          FROM site_visits
          WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Dubai') AT TIME ZONE 'Asia/Dubai'
        ) AS visits_today;
    `);
    const counts = result.rows[0];

    return {
      available: true,
      submissions: {
        total: Number(counts?.total ?? 0),
        pending: Number(counts?.pending ?? 0),
        approved: Number(counts?.approved ?? 0),
        rejected: Number(counts?.rejected ?? 0),
      },
      visitors: {
        total: Number(counts?.visitors_total ?? 0),
        today: Number(counts?.visits_today ?? 0),
      },
    };
  } catch {
    return { available: false };
  }
}

async function getGitHubStatus(repository: string): Promise<GitHubStatus> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repository}/commits/main`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "talal-kadli-portfolio-status",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) throw new Error("GitHub request failed.");

    const commit = (await response.json()) as GitHubCommit;
    return {
      available: true,
      repository,
      commit: {
        sha: commit.sha,
        url: commit.html_url,
        message: commit.commit.message.split("\n")[0] || "Untitled commit",
        author: commit.author?.login ?? null,
        committedAt: new Date(commit.commit.author.date),
      },
    };
  } catch {
    return { available: false, repository };
  }
}

export async function getSiteStatus(): Promise<SiteStatus> {
  const repository = getGitHubRepository();
  const [databaseStatus, githubStatus] = await Promise.all([
    getDatabaseStatus(),
    getGitHubStatus(repository),
  ]);

  return {
    checkedAt: new Date(),
    database: databaseStatus,
    github: githubStatus,
    runtime: {
      environment: process.env.NODE_ENV ?? "unknown",
      nodeVersion: process.version,
      processUptimeSeconds: Math.floor(process.uptime()),
      deploymentRevision:
        process.env.DEPLOYMENT_COMMIT_SHA ??
        process.env.GIT_COMMIT_SHA ??
        process.env.VERCEL_GIT_COMMIT_SHA ??
        null,
    },
  };
}
