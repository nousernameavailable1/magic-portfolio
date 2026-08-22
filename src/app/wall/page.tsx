import { WallBoard } from "@/components/wall/WallBoard";
import { getSiteText } from "@/lib/site-text";
import { baseURL } from "@/resources";
import { Meta } from "@once-ui-system/core";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const text = await getSiteText();
  return Meta.generate({
    title: "Anonymous thoughts",
    description: text["wall.description"],
    baseURL,
    path: "/wall",
  });
}

export default function WallPage() {
  return <WallBoard />;
}
