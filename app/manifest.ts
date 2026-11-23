import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Take Off With GenXCode · GenXCode Tech Fest",
    short_name: "GenXCode Fest",
    description:
      "Official portal for Take Off With GenXCode — entry QR passes, schedule, workshops, and project submissions.",
    start_url: "/",
    display: "standalone",
    background_color: "#fcfaff",
    theme_color: "#6828a2",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}