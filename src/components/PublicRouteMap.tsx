import { getPublicRouteStates } from "@/lib/public-routes";
import { PublicRouteMapClient } from "./PublicRouteMapClient";

export async function PublicRouteMap() {
  const routes = (await getPublicRouteStates()).filter((route) => route.listed);
  return <PublicRouteMapClient routes={routes} />;
}
