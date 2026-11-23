import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/auth", "/signup"],
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/volunteer",
          "/volunteer/",
          "/admin",
          "/admin/",
          "/api/",
        ],
      },
    ],
    sitemap: "https://techfest.genxcode.in/sitemap.xml",
    host: "https://techfest.genxcode.in",
  };
}