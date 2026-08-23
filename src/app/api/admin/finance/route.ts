import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { getFinanceVisibility, saveSiteText } from "@/lib/site-text";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  try {
    return NextResponse.json({ visible: await getFinanceVisibility() });
  } catch {
    return NextResponse.json({ error: "Finance visibility is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  const payload = (await request.json().catch(() => null)) as { visible?: unknown } | null;
  if (typeof payload?.visible !== "boolean") {
    return NextResponse.json({ error: "Invalid Finance visibility setting." }, { status: 400 });
  }

  try {
    await saveSiteText("about.financeVisible", payload.visible ? "true" : "false");
    revalidatePath("/about");
    return NextResponse.json({ visible: payload.visible });
  } catch {
    return NextResponse.json({ error: "Could not update Finance visibility." }, { status: 503 });
  }
}
