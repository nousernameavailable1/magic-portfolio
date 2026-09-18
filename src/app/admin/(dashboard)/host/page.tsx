import { HostManager } from "@/components/admin/HostManager";

export const metadata = { title: "Host", robots: { index: false, follow: false } };

export default function AdminHostPage() {
  return <HostManager />;
}
