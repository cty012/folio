import { notFound } from "next/navigation";
import { getNovelById, getChapter, getAllNovels, EMPTY_EXPORT_ID } from "@/lib/data";
import ReaderView from "@/components/ReaderView";
export async function generateStaticParams() {
  const routes = getAllNovels().flatMap(novel => novel.chapters.map(chapter => ({ id: novel.id, chapter: `chapter-${chapter.number}` })));
  return routes.length ? routes : [{ id: EMPTY_EXPORT_ID, chapter: "chapter-0" }];
}
export default async function ChapterPage({ params }: { params: Promise<{ id: string; chapter: string }> }) {
  const { id, chapter } = await params;
  if (id === EMPTY_EXPORT_ID) notFound();
  const novel = getNovelById(id);
  if (!novel) notFound();
  const number = novel.chapters.find(item => `chapter-${item.number}` === chapter)?.number;
  if (!number) notFound();
  const data = await getChapter(id, number);
  if (!data) notFound();
  return <ReaderView novel={novel} number={number} title={data.title} html={data.contentHtml} />;
}
