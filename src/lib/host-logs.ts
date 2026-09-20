export type HostLogLine = {
  id: number;
  text: string;
  service: string;
  timestamp: string;
  message: string;
};

const MAX_LINES = 2000;
const MAX_CHARACTERS = 512 * 1024;
const MAX_IDENTITIES = 20000;

function parseLine(text: string) {
  const match = text.match(/^([^|]+?)\s*\|\s*(?:(\d{4}-\d\d-\d\dT\S+)\s)?(.*)$/);
  const service = match?.[1].trim() || "system";
  const timestamp = match?.[2] || "";
  const message = match?.[3] ?? text;
  return {
    text: match ? `${service} | ${timestamp ? `${timestamp} ` : ""}${message}` : text,
    service,
    timestamp,
    message,
  };
}

/** Compose can interleave services differently on every read. Existing rows stay
 * in place; only unseen occurrences append. Counts preserve identical records.
 */
export class HostLogBuffer {
  private seen = new Map<string, number>();
  private nextId = 0;
  lines: HostLogLine[] = [];

  append(snapshot: string): HostLogLine[] {
    const occurrences = new Map<string, number>();
    const additions: Omit<HostLogLine, "id">[] = [];
    for (const raw of snapshot.replace(/\r\n/g, "\n").split("\n")) {
      if (!raw) continue;
      const line = parseLine(raw);
      const count = (occurrences.get(line.text) || 0) + 1;
      occurrences.set(line.text, count);
      if (count > (this.seen.get(line.text) || 0)) additions.push(line);
    }
    for (const [text, count] of occurrences) {
      const previous = this.seen.get(text) || 0;
      this.seen.delete(text);
      this.seen.set(text, Math.max(count, previous));
    }
    while (this.seen.size > MAX_IDENTITIES) {
      const oldest = this.seen.keys().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    if (!additions.length) return this.lines;
    additions.sort(
      (a, b) => a.timestamp.localeCompare(b.timestamp) || a.text.localeCompare(b.text),
    );
    const lines = [...this.lines, ...additions.map((line) => ({ ...line, id: ++this.nextId }))];
    let characters = 0;
    let start = lines.length;
    while (start > 0 && lines.length - start < MAX_LINES) {
      const size = lines[start - 1].text.length;
      if (characters + size > MAX_CHARACTERS) break;
      characters += size;
      start -= 1;
    }
    this.lines = lines.slice(start);
    return this.lines;
  }
}
