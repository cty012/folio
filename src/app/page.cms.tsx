import { requireLocalPage } from "@/lib/local-page";
import { listNovels, listGenres } from "@/lib/content-store";
import { bookView } from "@/lib/book-view";
import LibraryManager from "@/components/cms/LibraryManager";
export const dynamic = "force-dynamic";
export default async function Home() { await requireLocalPage(); return <LibraryManager novels={listNovels().map(bookView)} genres={listGenres()} />; }
