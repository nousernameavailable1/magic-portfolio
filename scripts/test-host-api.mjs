import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import { Readable } from "node:stream";
import ts from "typescript";

const require = createRequire(import.meta.url);

function fixture() {
  const calls = [];
  const exports = {};
  const auth = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/admin-auth.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: auth, require, Buffer, process: { env: { ADMIN_SESSION_SECRET: "test-secret-only-".repeat(4) } } });
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/app/api/admin/host/route.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require(name) {
      if (name === "@/lib/admin-auth") return auth;
      if (name === "next/server") return { NextResponse: Response };
      if (name === "@/lib/host-agent") return { hostAgent: async (operation) => {
        calls.push(operation);
        return { status: operation === "update" ? 202 : 200, body: { ok: true } };
      } };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const request = (overrides = {}) => ({
    cookies: { get: () => ({ value: auth.createAdminSession() }) },
    headers: new Headers({ "x-host-action": "update", "sec-fetch-site": "same-origin" }),
    nextUrl: new URL("https://portfolio.test/api/admin/host"), body: null,
    ...overrides,
  });
  return { exports, calls, request };
}

test("missing or forged admin sessions cannot read logs or update", async () => {
  const { exports, calls, request } = fixture();
  for (const method of ["GET", "POST"]) {
    for (const value of [undefined, "forged.session"]) {
      assert.equal((await exports[method](request({ cookies: { get: () => ({ value }) } }))).status, 401);
    }
  }
  assert.equal(calls.length, 0);
});

test("updates require same-origin custom header and reject all input", async () => {
  const { exports, calls, request } = fixture();
  for (const headers of [new Headers(), new Headers({ "x-host-action": "update", "sec-fetch-site": "cross-site" })]) {
    assert.equal((await exports.POST(request({ headers }))).status, 403);
  }
  assert.equal((await exports.POST(request({ body: new Request("https://portfolio.test", { method: "POST", body: "command=id" }).body }))).status, 400);
  assert.equal((await exports.POST(request({ nextUrl: new URL("https://portfolio.test/api/admin/host?command=id") }))).status, 400);
  assert.equal(calls.length, 0);
});

test("Next's Node adapter empty POST stream starts the deployment", async () => {
  const { NextRequestAdapter } = require("next/dist/server/web/spec-extension/adapters/next-request");
  const { exports, calls, request } = fixture();
  const adapted = NextRequestAdapter.fromNodeNextRequest({
    url: "https://portfolio.test/api/admin/host", method: "POST",
    headers: { "content-length": "0" }, body: Readable.from([]),
  }, new AbortController().signal);
  assert.notEqual(adapted.body, null, "Reproduce the stream supplied for an empty incoming POST");
  assert.equal((await exports.POST(request({ body: adapted.body }))).status, 202);
  assert.deepEqual(calls, ["update"]);
});

test("authenticated requests forward only fixed operations and disable caching", async () => {
  const { exports, calls, request } = fixture();
  const logs = await exports.GET(request());
  assert.equal(logs.status, 200);
  assert.equal(logs.headers.get("cache-control"), "no-store");
  assert.equal((await exports.POST(request())).status, 202);
  assert.deepEqual(calls, ["status", "update"]);
});
