import { Column, Heading, Text } from "@once-ui-system/core";

export const metadata = { title: "VPN" };

export default function AdminVpnPage() {
  return (
    <Column maxWidth="m" gap="12" paddingY="24">
      <Heading as="h1" variant="display-strong-l">VPN</Heading>
      <Text variant="heading-default-l" onBackground="neutral-weak">Planned.</Text>
    </Column>
  );
}
