import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ScrollEffects } from "@/components/scroll-effects";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://takeoff.genxcode.in";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fcfaff",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Take Off With GenXCode | Build What Matters",
    template: "%s · Take Off With GenXCode",
  },
  description:
    "Three days of AI workshops, PromptWars hackathon, and live pitching. Celebrate one year of GenXCode by Cosmolix.",
  applicationName: "Take Off With GenXCode",
  keywords: [
    "Take Off With GenXCode",
    "GenXCode",
    "Cosmolix",
    "PromptWars",
    "Hackathon",
    "AI Workshop",
    "Pune Tech Fest",
  ],
  authors: [{ name: "GenXCode by Cosmolix" }],
  creator: "GenXCode by Cosmolix",
  publisher: "Cosmolix Private Limited",
  icons: {
    icon: [{ url: "/genxcode-mark.webp", type: "image/webp" }],
    shortcut: "/genxcode-mark.webp",
    apple: "/genxcode-mark.webp",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Take Off With GenXCode",
    title: "Take Off With GenXCode | Build What Matters",
    description:
      "Three days of AI workshops, PromptWars hackathon, and live pitching. Celebrate one year of GenXCode by Cosmolix.",
    images: [
      {
        url: "/genxcode-hackathon-team.png",
        width: 1200,
        height: 630,
        alt: "Take Off With GenXCode — AI Workshop, PromptWars & Pitching",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Take Off With GenXCode | Build What Matters",
    description:
      "Three days of AI workshops, PromptWars hackathon, and live pitching. Celebrate one year of GenXCode by Cosmolix.",
    images: ["/genxcode-hackathon-team.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-[#fcfaff] text-[#220749] antialiased selection:bg-[#5f2295] selection:text-white">
        <ScrollEffects />
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  );
}