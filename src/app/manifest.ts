import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HQ — Personal Headquarters",
    short_name: "HQ",
    description: "Tasks, time-blocking and finance opportunities in one calm, fast app.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#4f46e5",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
