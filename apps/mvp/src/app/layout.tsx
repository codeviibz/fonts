import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { NavServer } from "@/components/nav-server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const DEFAULT_SITE_URL = "http://localhost:3000";
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? DEFAULT_SITE_URL;

function resolveSiteUrl(input: string): URL {
  try {
    return new URL(input);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

const siteUrl = resolveSiteUrl(rawSiteUrl);
const siteUrlString = siteUrl.toString();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Fonts",
    template: "%s | Fonts",
  },
  description: "Discover premium typefaces with a subscription-friendly font catalog.",
  openGraph: {
    title: "Fonts",
    description: "Discover premium typefaces with a subscription-friendly font catalog.",
    url: siteUrlString,
    siteName: "Fonts",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fonts",
    description: "Discover premium typefaces with a subscription-friendly font catalog.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <NavServer />
          {children}
        </Providers>
      </body>
    </html>
  );
}
