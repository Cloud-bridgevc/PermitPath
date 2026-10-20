import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_DOMAIN, SITE_URL } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
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
      <body>{children}</body>
    </html>
  );
}
