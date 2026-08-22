import { TextManager } from "@/components/admin/TextManager";
import { Column, Heading, Text } from "@once-ui-system/core";

export const metadata = { title: "Text" };

export default function AdminTextPage() {
  return (
    <Column maxWidth="l" fillWidth gap="24" paddingY="24">
      <Column gap="8">
        <Heading as="h1" variant="display-strong-l">
          Text
        </Heading>
        <Text variant="heading-default-l" onBackground="neutral-weak">
          Update the various pieces of text around the site.
        </Text>
      </Column>
      <TextManager />
    </Column>
  );
}
