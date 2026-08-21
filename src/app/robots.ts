import { pageAccessRoutes } from "@/lib/page-access-routes";
import { baseURL } from "@/resources";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: [...pageAccessRoutes],
      },
    ],
    sitemap: `${baseURL}/sitemap.xml`,
  };
}
