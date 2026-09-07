import type { Metadata } from "next";
import { getDictionary, getLanguage } from "@/lib/dictionary";
import { Labels } from "@/components/Labels";
import { FolioMark } from "@/components/FolioMark";
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
  return <html lang={getLanguage()}><body><Labels value={dictionary}>
    <a className="skip-link" href="#page-content">{dictionary.reading}</a>
    <header className="app-header"><div className="page-width header-inner"><a className="wordmark" href="/" aria-label="Folio"><FolioMark /><span>folio<span className="wordmark-period">.</span></span></a><a className="header-library" href="/">{dictionary.library}</a><span className="header-note">{process.env.FOLIO_MODE === "cms" ? dictionary.local_library : dictionary.reading}</span></div></header>
    <div id="page-content">{children}</div>
  </Labels></body></html>;
}
