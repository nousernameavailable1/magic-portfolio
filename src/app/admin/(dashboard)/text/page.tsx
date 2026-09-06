import { TextManager } from "@/components/admin/TextManager";
import { Column } from "@once-ui-system/core";

export const metadata = { title: "Text" };

export default function AdminTextPage() {
  return (
    <Column maxWidth="l" fillWidth gap="24" paddingY="24">
      <TextManager />
    </Column>
  );
}
