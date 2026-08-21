import { WallBoard } from "@/components/wall/WallBoard";
import { baseURL } from "@/resources";
import { Meta } from "@once-ui-system/core";

export async function generateMetadata() {
  return Meta.generate({
    title: "Anonymous thoughts",
    description: "Share anonymous feedback, thoughts, or confessions.",
    baseURL,
    path: "/wall",
  });
}

export default function WallPage() {
  return <WallBoard />;
}
