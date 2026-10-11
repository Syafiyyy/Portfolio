import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";
import { SITE } from "@/data/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: `${SITE.name}, backend developer`,
  description: SITE.headline,
  openGraph: {
    title: SITE.name,
    description: SITE.headline,
    url: SITE.url,
    siteName: SITE.name,
    locale: "en_MY",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Nav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
