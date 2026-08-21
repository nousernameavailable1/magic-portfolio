import { isPageAccessRoute } from "@/lib/page-access-routes";
import { baseURL, routes as routesConfig } from "@/resources";

export default async function sitemap() {
  const activeRoutes = Object.keys(routesConfig).filter(
    (route) => routesConfig[route as keyof typeof routesConfig] && !isPageAccessRoute(route),
  );

  const routes = activeRoutes.map((route) => ({
    url: `${baseURL}${route !== "/" ? route : ""}`,
    lastModified: new Date().toISOString().split("T")[0],
  }));

  return routes;
}
