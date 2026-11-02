import Script from "next/script";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./glow.css";
import { SITE_DOMAIN, SITE_URL } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(SITE_URL),
  applicationName: "PermitPath",
  title: { default: "PermitPath — Permit application management", template: "%s · PermitPath" },
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: SITE_URL, siteName: `PermitPath · ${SITE_DOMAIN}`, title: "PermitPath — Permit application management" },
  description:
    "PermitPath organizes permit requirements, documents, submissions and renewals across locations, with AI that cites the official source for every requirement.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Script src="/glow.js" strategy="afterInteractive" />
        <script type="application/ld+json" id="founders-ld" dangerouslySetInnerHTML={{ __html: "{\"@context\": \"https://schema.org\", \"@type\": \"Organization\", \"name\": \"PermitPath\", \"url\": \"https://permitpath.site\", \"email\": \"hello@permitpath.site\", \"logo\": \"https://permitpath.site/icon-512.png\", \"founder\": [{\"@type\": \"Person\", \"name\": \"Friday Bonny\", \"jobTitle\": \"Founder/CEO\"}, {\"@type\": \"Person\", \"name\": \"Goodluck Edet\", \"jobTitle\": \"Co-founder/CTO\"}]}" }} />{children}</body>
    </html>
  );
}
