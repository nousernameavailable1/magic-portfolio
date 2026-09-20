import { FakeTerminal } from "@/components/terminal/FakeTerminal";
import { getSiteText } from "@/lib/site-text";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terminal",
  robots: { index: false, follow: false },
};

export default async function TerminalPage() {
  const text = await getSiteText();
  return <FakeTerminal description={text["terminal.description"]} />;
}
