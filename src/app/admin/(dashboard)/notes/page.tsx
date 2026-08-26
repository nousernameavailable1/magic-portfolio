import { NoteManager } from "@/components/admin/NoteManager";
import { Column, Heading, Text } from "@once-ui-system/core";

export const metadata = { title: "Notes" };

export default function AdminNotesPage() {
  return (
    <Column maxWidth="l" fillWidth gap="24" paddingY="24">
      <Column gap="8">
        <Heading as="h1" variant="display-strong-l">
          Notes
        </Heading>
        <Text variant="heading-default-l" onBackground="neutral-weak">
          Write, edit, and control the visibility of every note.
        </Text>
      </Column>
      <NoteManager />
    </Column>
  );
}
