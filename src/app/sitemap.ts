import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/use-cases", "/demo", "/pricing", "/faq", "/request-demo"].map((p) => ({ url: `${SITE_URL}${p}` }));
}
