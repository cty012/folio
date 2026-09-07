import type { Metadata } from "next";
import { getDictionary, getLanguage } from "@/lib/dictionary";
import { Labels } from "@/components/Labels";
import { Icon } from "@/components/Icons";
import "./globals.css";
export const metadata: Metadata = { title: "Folio", description: "A personal library of stories" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const dictionary = getDictionary();
  return <html lang={getLanguage()}><body><Labels value={dictionary}>
    <a className="skip-link" href="#page-content">{dictionary.reading}</a>
    <header className="app-header"><div className="page-width header-inner"><a className="wordmark" href="/" aria-label="Folio"><Icon name="book" size={25} /><span>folio<span className="wordmark-period">.</span></span></a><a className="header-library" href="/">{dictionary.library}</a><span className="header-note">{process.env.FOLIO_MODE === "cms" ? dictionary.local_library : dictionary.reading}</span></div></header>
    <div id="page-content">{children}</div>
  </Labels></body></html>;
}
