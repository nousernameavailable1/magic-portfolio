import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { hostAgent } from "@/lib/host-agent";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function handle(request: NextRequest, operation: "status" | "update") {
  if (!isValidAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) {
    return json({ error: "Unauthorized." }, 401);
  }
  if (request.nextUrl.search) return json({ error: "Parameters are not accepted." }, 400);
  if (operation === "update") {
    // A custom header requires a preflight for cross-origin callers. Do not enable CORS here.
    if (
      request.headers.get("x-host-action") !== "update" ||
      request.headers.get("sec-fetch-site") !== "same-origin"
    ) {
      return json({ error: "Same-origin browser request required." }, 403);
    }
    if (request.body !== null) return json({ error: "A request body is not accepted." }, 400);
  }
  try {
    const result = await hostAgent(operation);
    return json(result.body, result.status);
  } catch {
    return json(
      {
        error:
          "Host agent unavailable. Check the VM setup; if an update was started, it may still be running.",
      },
      503,
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request, "status");
}
export async function POST(request: NextRequest) {
  return handle(request, "update");
}
