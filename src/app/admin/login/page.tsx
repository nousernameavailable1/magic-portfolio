import { AdminLoginForm } from "@/components/wall/AdminLoginForm";
import { Column, Heading, Text } from "@once-ui-system/core";

export const metadata = { title: "Admin sign in" };

export default function AdminLoginPage() {
  return (
    <Column maxWidth="xs" fillWidth gap="20" paddingY="48" horizontal="center" align="center">
      <Column gap="8" horizontal="center" align="center">
        <Heading as="h1" align="center" variant="display-strong-l">
          Admin
        </Heading>
        <Text align="center" onBackground="neutral-weak">
          Nothing to see here...
        </Text>
      </Column>
      <AdminLoginForm />
    </Column>
  );
}
