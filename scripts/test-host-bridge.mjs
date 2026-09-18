import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const token = "a".repeat(64);
const compiled = ts.transpileModule(
  readFileSync(new URL("../src/lib/host-agent.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function client(env) {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Buffer, URL, setTimeout, clearTimeout, process: { env },
    require: (name) => name === "server-only" ? {} : require(name),
  });
  return exports.hostAgent;
}

async function withServer(handler, run) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("bridge transport sends only fixed authenticated requests without bodies", async () => {
  const seen = [];
  await withServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      seen.push([req.method, req.url, req.headers.authorization, body]);
      res.writeHead(req.method === "POST" ? 202 : 200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  }, async (url) => {
    const bridge = client({ HOST_AGENT_URL: url, HOST_AGENT_TOKEN: token });
    assert.equal((await bridge("status")).status, 200);
    assert.equal((await bridge("update")).status, 202);
  });
  assert.deepEqual(seen, [
    ["GET", "/status", `Bearer ${token}`, ""],
    ["POST", "/update", `Bearer ${token}`, ""],
  ]);
});

test("bridge requires a secret and rejects endpoint credentials, paths and parameters", async () => {
  for (const env of [
    {}, { HOST_AGENT_TOKEN: "short" },
    ...["https://bridge", "http://user:pass@bridge", "http://bridge/exec", "http://bridge/?cmd=id", "http://bridge/#fragment"].map(
      (url) => ({ HOST_AGENT_URL: url, HOST_AGENT_TOKEN: token }),
    ),
  ]) {
    await assert.rejects(client(env)("status"));
  }
});

test("bridge does not follow redirects or forward credentials to a new destination", async () => {
  let requests = 0;
  await withServer((_req, res) => {
    requests += 1;
    res.writeHead(302, { Location: "http://127.0.0.1:1/steal" });
    res.end('{"error":"redirect"}');
  }, async (url) => {
    const result = await client({ HOST_AGENT_URL: url, HOST_AGENT_TOKEN: token })("status");
    assert.equal(result.status, 302);
  });
  assert.equal(requests, 1);
});

test("malformed and oversized bridge responses are rejected", async () => {
  for (const body of ["not json", "x".repeat(2 * 1024 * 1024 + 1)]) {
    await withServer((_req, res) => res.end(body), async (url) => {
      await assert.rejects(client({ HOST_AGENT_URL: url, HOST_AGENT_TOKEN: token })("status"));
    });
  }
});
