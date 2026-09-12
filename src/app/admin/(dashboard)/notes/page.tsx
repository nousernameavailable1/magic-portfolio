import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { NoteManager } from "@/components/admin/NoteManager";
import { Column } from "@once-ui-system/core";

export const metadata = { title: "Notes" };

export default function AdminPage() {
  return (
    <Column fillWidth gap="24">
      <AdminPageHeader
        eyebrow="Content / Writing"
        title="Notes"
        description="A space for your thoughts. Write, refine, and choose what to share."
      />
      <NoteManager />
    </Column>
  );
}
