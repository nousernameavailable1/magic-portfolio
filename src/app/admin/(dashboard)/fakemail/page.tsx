import { FakemailManager } from "@/components/admin/FakemailManager";
import { Column, Heading, Text } from "@once-ui-system/core";

export const metadata = { title: "Fakemail" };

export default function FakemailPage() {
  return (
    <Column maxWidth="l" fillWidth gap="24" paddingY="24">
      <Column gap="8">
        <Heading as="h1" variant="display-strong-l">
          Fakemail
        </Heading>
        <Text variant="heading-default-l" onBackground="neutral-weak">
          Create temporary email aliases that forward to you.
        </Text>
      </Column>
      <FakemailManager />
    </Column>
  );
}
