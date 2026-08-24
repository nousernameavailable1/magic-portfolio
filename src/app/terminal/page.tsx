import { FakeTerminal } from "@/components/terminal/FakeTerminal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terminal",
  robots: { index: false, follow: false },
};

export default function TerminalPage() {
  return <FakeTerminal />;
}
