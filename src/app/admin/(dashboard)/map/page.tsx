import { RouteMapManager } from "@/components/admin/RouteMapManager";
import { getPublicRouteStates } from "@/lib/public-routes";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Site map",
};

export default async function AdminMapPage() {
  return <RouteMapManager initialRoutes={await getPublicRouteStates()} />;
}
