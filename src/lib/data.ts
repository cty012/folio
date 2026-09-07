import type { Novel } from "./definitions";
import { listNovels, readNovel, readMarkdown } from "./content-store";
import { renderMarkdown } from "./markdown";

// Only this public projection reaches reader pages and their serialized props.
function publicNovel(novel: ReturnType<typeof listNovels>[number]): Novel {
  return {
    id: novel.id, title: novel.title, author: novel.author, genre: novel.genre,
    description: novel.description, date: novel.date, status: novel.status,
    chapters: novel.chapters.filter(chapter => chapter.published).map(chapter => ({
      number: chapter.number, title: chapter.published!.title,
    })),
  };
}

export function getAllNovels(): Novel[] {
  return listNovels().filter(novel => novel.publication === "published").map(publicNovel);
}

export function getNovelById(id: string): Novel | undefined {
  const novel = readNovel(id);
  return novel?.publication === "published" ? publicNovel(novel) : undefined;
}

export async function getChapter(id: string, number: number) {
  const novel = getNovelById(id);
  if (!novel) return null;
  const index = novel.chapters.findIndex(chapter => chapter.number === number);
  if (index === -1) return null;
  const stored = readNovel(id)!.chapters.find(chapter => chapter.number === number)!;
  const contentHtml = await renderMarkdown(readMarkdown(id, stored.published!.contentFile));
  return { ...novel.chapters[index], contentHtml,
    prevChapter: novel.chapters[index - 1] || null, nextChapter: novel.chapters[index + 1] || null };
}

// Reserved (not a valid novel ID): Next 15 rejects empty static parameter lists.
export const EMPTY_EXPORT_ID = "_folio-empty";
