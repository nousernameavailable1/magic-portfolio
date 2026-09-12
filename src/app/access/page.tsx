import { PageAccessForm } from "@/components/PageAccessForm";
import { getSiteText } from "@/lib/site-text";

export const dynamic = "force-dynamic";

type AccessPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

function getReturnPath(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const [params, text] = await Promise.all([searchParams, getSiteText()]);

  return (
    <PageAccessForm
      returnTo={getReturnPath(params.next)}
      headline={text["access.headline"]}
      description={text["access.description"]}
      formHeading={text["access.formHeading"]}
    />
  );
}
