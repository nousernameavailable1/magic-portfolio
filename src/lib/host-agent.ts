import "server-only";

import { request } from "node:http";

// Only these two operations can cross the boundary into the VM agent.
export function hostAgent(operation: "status" | "update") {
  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const token = process.env.HOST_AGENT_TOKEN;
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return reject(new Error("Host bridge is not configured."));
    }
    const endpoint = new URL(process.env.HOST_AGENT_URL || "http://host-bridge:8080");
    if (
      endpoint.protocol !== "http:" ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash ||
      endpoint.pathname !== "/"
    ) {
      return reject(new Error("Invalid host bridge endpoint."));
    }
    const req = request(
      {
        hostname: endpoint.hostname,
        port: endpoint.port || 80,
        path: operation === "status" ? "/status" : "/update",
        method: operation === "status" ? "GET" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2 * 1024 * 1024) req.destroy(new Error("Host response too large."));
          else chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode ?? 502,
              body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    const deadline = setTimeout(() => req.destroy(new Error("Host agent timed out.")), 15000);
    req.on("close", () => clearTimeout(deadline));
    req.on("error", reject);
    req.end();
  });
}
