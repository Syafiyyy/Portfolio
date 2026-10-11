import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { SmoothScroll } from "@/components/smooth-scroll";
import { Intro, INTRO_BOOT } from "@/components/intro";
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
  // Images for both come from opengraph-image.png / twitter-image.png.
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.headline,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT }} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Nav />
          {children}
          <Footer />
          <SmoothScroll />
          <Intro />
        </ThemeProvider>
      </body>
    </html>
  );
}
