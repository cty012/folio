import type { Metadata } from "next";
import { getDictionary, getLanguage } from "@/lib/dictionary";
import { appearanceScript } from "@/lib/appearance";
import { Labels } from "@/components/Labels";
import { FolioMark } from "@/components/FolioMark";
import Appearance from "@/components/Appearance";
import "katex/dist/katex.min.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "Folio",
  description: "A personal library of stories",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/images/folio-logo.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const dictionary = getDictionary();
  // The appearance script sets theme and text-size attributes on <html> before hydration.
  return <html lang={getLanguage()} suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: appearanceScript }} /></head>
    <body><Labels value={dictionary}>
      <a className="skip-link" href="#page-content">{dictionary.reading}</a>
      <header className="app-header"><div className="page-width header-inner">
        <a className="wordmark" href="/" aria-label="Folio"><span className="wordmark-mark"><FolioMark size={19} /></span><span className="wordmark-text">folio<span className="wordmark-period">.</span></span></a>
        <nav className="header-nav"><a href="/">{dictionary.library}</a></nav>
        <span className="header-note">{process.env.FOLIO_MODE === "cms" ? dictionary.local_library : dictionary.reading}</span>
        <Appearance />
      </div></header>
      <div id="page-content">{children}</div>
    </Labels></body>
  </html>;
}
