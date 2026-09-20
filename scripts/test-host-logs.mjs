import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/host-logs.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const { HostLogBuffer } = exports;
const line = (service, id, message = "ready") => `${service} | 2026-09-20T12:00:00.${String(id).padStart(9, "0")}Z ${message}`;

test("reordered and unchanged Compose snapshots keep exactly the same rows", () => {
  const buffer = new HostLogBuffer();
  const a = line("app", 1), b = line("db", 2), c = line("caddy", 3);
  const original = buffer.append([c, a, b].join("\n"));
  assert.deepEqual(Array.from(original, (row) => row.text), [a, b, c]);
  for (const snapshot of [[b, c, a], [c, b, a], [a, b, c]]) {
    assert.equal(buffer.append(snapshot.join("\n")), original);
  }
});

test("rolling snapshots append only new lines, preserving old records and IDs", () => {
  const buffer = new HostLogBuffer();
  const a = line("app", 1), b = line("db", 2), c = line("app", 3), d = line("app", 4);
  const original = buffer.append([a, b].join("\n"));
  const updated = buffer.append([b, c, a].join("\n"));
  assert.equal(updated[0], original[0]);
  assert.equal(updated[1], original[1]);
  assert.deepEqual(Array.from(updated, (row) => row.text), [a, b, c]);
  buffer.append(d);
  assert.equal(buffer.append([a, d, b, c].join("\n")).length, 4);
});

test("same messages at different timestamps and repeated identical records are retained", () => {
  const buffer = new HostLogBuffer();
  const a = line("app", 1), b = line("app", 2);
  assert.equal(buffer.append([a, a, b].join("\n")).length, 3);
  assert.equal(buffer.append([b, a, a].join("\n")).length, 3);
  assert.equal(buffer.append([a, b, a, a].join("\n")).length, 4);
});

test("prefix padding, CRLF, empty reads, and temporarily missing services do not duplicate rows", () => {
  const buffer = new HostLogBuffer();
  const a = line("app", 1), b = line("db", 2);
  const original = buffer.append(`${a}\n${b}\n`);
  assert.equal(buffer.append(""), original);
  assert.equal(buffer.append(b), original);
  assert.equal(buffer.append(`${b}\r\n${a.replace("app |", "app     |")}\r\n`), original);
});

test("visible history is bounded without reintroducing recently evicted lines", () => {
  const buffer = new HostLogBuffer();
  const snapshot = Array.from({ length: 2100 }, (_, id) => line("app", id)).join("\n");
  const result = buffer.append(snapshot);
  assert.equal(result.length, 2000);
  assert.equal(buffer.append(snapshot), result);
});
