import { requireLocalPage } from "@/lib/local-page";
import { notFound } from "next/navigation";
import { readNovel, workspaceNovel, readMarkdown } from "@/lib/content-store";
import { renderMarkdown } from "@/lib/markdown";
import ChapterEditor from "@/components/cms/ChapterEditor";
export const dynamic = "force-dynamic";
export default async function ChapterPage({ params, searchParams }: { params: Promise<{ id: string; chapter: string }>; searchParams: Promise<{ write?: string }> }) {
  await requireLocalPage();
  const { id, chapter } = await params;
  if (!readNovel(id)) notFound();
  const novel = workspaceNovel(id);
  const item = novel.chapters.find(item => `chapter-${item.number}` === chapter);
  if (!item) notFound();
  const [html, publishedHtml] = await Promise.all([
    renderMarkdown(item.markdown),
    item.published ? renderMarkdown(readMarkdown(id, item.published.contentFile)) : Promise.resolve(null),
  ]);
  return <ChapterEditor key={`${id}:${item.number}`} initialNovel={novel} number={item.number} initialHtml={html} initialPublishedHtml={publishedHtml} startEditing={(await searchParams).write === "1"} />;
}
