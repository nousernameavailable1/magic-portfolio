import "server-only";

import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

export type SourceMeasure = { label: string; files: number; lines: number; detail: string };
export type PortfolioSourceMetrics = { layers: SourceMeasure[]; languages: SourceMeasure[] };

// A build-time source inventory, not traffic, bundle size, or a performance benchmark.
export async function getPortfolioSourceMetrics(): Promise<PortfolioSourceMetrics> {
  const layers: SourceMeasure[] = [
    {
      label: "Interface",
      files: 0,
      lines: 0,
      detail: "src/components · Reusable views and feature interactions.",
    },
    {
      label: "Routes & content",
      files: 0,
      lines: 0,
      detail: "src/app · Pages, API handlers, layouts, styles and MDX entries.",
    },
    {
      label: "Server & utilities",
      files: 0,
      lines: 0,
      detail: "src/lib + src/utils · Data access, authorization and shared helpers.",
    },
    {
      label: "Configuration & other",
      files: 0,
      lines: 0,
      detail: "Remaining src files · Resources, types and application setup.",
    },
  ];
  const languages: SourceMeasure[] = [
    {
      label: "TypeScript / TSX",
      files: 0,
      lines: 0,
      detail: "Application behavior, components and typed server code.",
    },
    {
      label: "Styles",
      files: 0,
      lines: 0,
      detail: "CSS and SCSS, including responsive layouts and interaction states.",
    },
    {
      label: "MDX",
      files: 0,
      lines: 0,
      detail: "Long-form project and blog content stored alongside the code.",
    },
    {
      label: "JavaScript",
      files: 0,
      lines: 0,
      detail: "JavaScript source and module files within src.",
    },
  ];
  const extensions = new Map([
    [".ts", 0],
    [".tsx", 0],
    [".css", 1],
    [".scss", 1],
    [".mdx", 2],
    [".js", 3],
    [".mjs", 3],
    [".cjs", 3],
  ]);
  async function walk(directory: string, root = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path, root || entry.name);
      } else if (entry.isFile()) {
        const language = extensions.get(extname(entry.name));
        if (language === undefined) continue;
        const lines = (await readFile(path, "utf8"))
          .split(/\r?\n/)
          .filter((line) => line.trim()).length;
        const layer =
          root === "components" ? 0 : root === "app" ? 1 : ["lib", "utils"].includes(root) ? 2 : 3;
        for (const measure of [layers[layer], languages[language]]) {
          measure.files += 1;
          measure.lines += lines;
        }
      }
    }
  }
  await walk(join(process.cwd(), "src"));
  return { layers, languages: languages.filter((language) => language.files > 0) };
}
