import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FakemailManager } from "@/components/admin/FakemailManager";
import { Column } from "@once-ui-system/core";

export const metadata = { title: "Fakemail" };

export default function AdminPage() {
  return (
    <Column fillWidth gap="24">
      <AdminPageHeader
        eyebrow="Tools / Email aliases"
        title="Fakemail"
        description="A little distance between your inbox and the internet."
      />
      <FakemailManager />
    </Column>
  );
}
