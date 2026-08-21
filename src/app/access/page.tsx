import { PageAccessForm } from "@/components/PageAccessForm";

type AccessPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

function getReturnPath(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function AccessPage({ searchParams }: AccessPageProps) {
  return <PageAccessForm returnTo={getReturnPath((await searchParams).next)} />;
}
