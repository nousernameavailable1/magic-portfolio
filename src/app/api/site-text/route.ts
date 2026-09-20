import { getSiteText } from "@/lib/site-text";
import { NextResponse } from "next/server";

export async function GET() {
  const text = await getSiteText();
  return NextResponse.json(
    { value: text["notFound.description"] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
