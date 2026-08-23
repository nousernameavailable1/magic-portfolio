import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".css", ".scss", ".mdx"]);
const EXCLUDED_DIRECTORIES = new Set([".agents", ".git", ".next", ".vscode", "node_modules", "public"]);
const CODE_FILES_WITHOUT_EXTENSIONS = new Set(["Dockerfile"]);

async function collectCodeMetrics(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  let fileCount = 0;
  let nonEmptyLineCount = 0;

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRECTORIES.has(entry.name)) continue;

      const nestedMetrics = await collectCodeMetrics(join(directory, entry.name));
      fileCount += nestedMetrics.fileCount;
      nonEmptyLineCount += nestedMetrics.nonEmptyLineCount;
      continue;
    }

    if (
      !entry.isFile() ||
      (!CODE_EXTENSIONS.has(extname(entry.name)) && !CODE_FILES_WITHOUT_EXTENSIONS.has(entry.name))
    ) {
      continue;
    }

    const file = await readFile(join(directory, entry.name), "utf8");
    fileCount += 1;
    nonEmptyLineCount += file.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  }

  return { fileCount, nonEmptyLineCount };
}

const metrics = await collectCodeMetrics(process.cwd());
const publicDirectory = join(process.cwd(), "public");

await mkdir(publicDirectory, { recursive: true });
await writeFile(join(publicDirectory, "site-code-metrics.json"), `${JSON.stringify(metrics)}\n`);
