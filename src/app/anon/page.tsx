import { AnonBoard } from "@/components/anon/AnonBoard";
import { baseURL } from "@/resources";
import { Meta } from "@once-ui-system/core";

export async function generateMetadata() {
  return Meta.generate({
    title: "Anonymous thoughts",
    description: "Share anonymous feedback, thoughts, or confessions.",
    baseURL,
    path: "/anon",
  });
}

export default function AnonPage() {
  return <AnonBoard />;
}
