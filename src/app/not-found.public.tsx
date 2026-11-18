import Link from "next/link";
import { getDictionary } from "@/lib/dictionary";
export default function NotFound() {
  const t = getDictionary();
  return <main className="page-width empty-state"><p className="eyebrow">404</p><h1>{t.page_not_found}</h1><p>{t.page_not_found_message}</p><Link className="button" href="/">{t.back_to_all_novels}</Link></main>;
}
