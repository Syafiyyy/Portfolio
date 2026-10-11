import type { MetadataRoute } from "next";
import { SITE } from "@/data/site";

// One page; its address comes from SITE.url.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE.url, changeFrequency: "monthly", priority: 1 }];
}
