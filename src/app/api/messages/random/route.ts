import { isRandomMessageCategory } from "@/lib/random-message-data";
import type { RandomMessageCategory } from "@/lib/random-message-data";
import { getRandomMessage } from "@/lib/random-messages";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestedCategory = request.nextUrl.searchParams.get("category");
  if (requestedCategory && !isRandomMessageCategory(requestedCategory)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  try {
    const category = (requestedCategory || undefined) as RandomMessageCategory | undefined;
    const message = await getRandomMessage(category);
    return NextResponse.json(
      { message },
      {
        status: message ? 200 : 404,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json({ error: "The message pool is unavailable." }, { status: 503 });
  }
}
