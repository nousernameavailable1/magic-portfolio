import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import {
  getSiteTextDefinition,
  getSiteTextState,
  isSiteTextKey,
  resetSiteText,
  saveSiteText,
  setSiteTextDefault,
  siteTextDefinitions,
} from "@/lib/site-text";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function revalidateAboutDetails(key: string) {
  if (key.startsWith("about.finance.") || key.startsWith("about.crypto.")) {
    revalidatePath("/about");
  }
}

async function getFields() {
  const text = await getSiteTextState();
  return siteTextDefinitions.map((definition) => ({
    ...definition,
    defaultValue: text.defaults[definition.key],
    value: text.values[definition.key],
  }));
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  try {
    return NextResponse.json({ fields: await getFields() });
  } catch {
    return NextResponse.json({ error: "The text settings are unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  const payload = (await request.json().catch(() => null)) as {
    key?: unknown;
    value?: unknown;
  } | null;
  if (
    typeof payload?.key !== "string" ||
    !isSiteTextKey(payload.key) ||
    typeof payload.value !== "string"
  ) {
    return NextResponse.json({ error: "Invalid text update." }, { status: 400 });
  }

  const definition = getSiteTextDefinition(payload.key);
  const value = payload.value.trim();
  if (!value || value.length > definition.maxLength) {
    return NextResponse.json(
      { error: `Text must be between 1 and ${definition.maxLength} characters.` },
      { status: 400 },
    );
  }

  try {
    await saveSiteText(payload.key, value);
    revalidateAboutDetails(payload.key);
    return NextResponse.json({ field: { ...definition, value } });
  } catch {
    return NextResponse.json({ error: "Could not save this text." }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  const payload = (await request.json().catch(() => null)) as {
    key?: unknown;
    value?: unknown;
  } | null;
  if (
    typeof payload?.key !== "string" ||
    !isSiteTextKey(payload.key) ||
    typeof payload.value !== "string"
  ) {
    return NextResponse.json({ error: "Invalid default text." }, { status: 400 });
  }

  const definition = getSiteTextDefinition(payload.key);
  const value = payload.value.trim();
  if (!value || value.length > definition.maxLength) {
    return NextResponse.json(
      { error: `Text must be between 1 and ${definition.maxLength} characters.` },
      { status: 400 },
    );
  }

  try {
    await setSiteTextDefault(payload.key, value);
    revalidateAboutDetails(payload.key);
    return NextResponse.json({
      field: { ...definition, defaultValue: value, value },
    });
  } catch {
    return NextResponse.json({ error: "Could not set this text as the default." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  const key = request.nextUrl.searchParams.get("key");
  if (!key || !isSiteTextKey(key)) {
    return NextResponse.json({ error: "Invalid text field." }, { status: 400 });
  }

  try {
    const definition = getSiteTextDefinition(key);
    await resetSiteText(key);
    revalidateAboutDetails(key);
    const text = await getSiteTextState();
    return NextResponse.json({
      field: {
        ...definition,
        defaultValue: text.defaults[key],
        value: text.values[key],
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not reset this text." }, { status: 503 });
  }
}
