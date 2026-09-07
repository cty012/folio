import { notFound } from "next/navigation";
import { getNovelById, getAllNovels, EMPTY_EXPORT_ID } from "@/lib/data";
import BookDetails from "@/components/BookDetails";
export async function generateStaticParams() {
  const novels = getAllNovels();
  return novels.length ? novels.map(novel => ({ id: novel.id })) : [{ id: EMPTY_EXPORT_ID }];
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const novel = id === EMPTY_EXPORT_ID ? undefined : getNovelById(id);
  return { title: novel ? `${novel.title} · Folio` : "Folio" };
}
export default async function NovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === EMPTY_EXPORT_ID) notFound();
  const novel = getNovelById(id);
  if (!novel) notFound();
  return <BookDetails novel={novel} />;
}
