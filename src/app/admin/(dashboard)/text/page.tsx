import { TextManager } from "@/components/admin/TextManager";
import { getSiteTextState, siteTextDefinitions } from "@/lib/site-text";
import { Column } from "@once-ui-system/core";

export const metadata = { title: "Site content" };

export default async function AdminTextPage() {
  const text = await getSiteTextState();
  const initialFields = siteTextDefinitions.map((definition) => ({
    ...definition,
    defaultValue: text.defaults[definition.key],
    value: text.values[definition.key],
  }));

  return (
    <Column maxWidth="l" fillWidth gap="24" paddingY="24">
      <TextManager initialFields={initialFields} />
    </Column>
  );
}
