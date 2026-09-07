import type { BookView, StoredNovel } from "./definitions";
export function bookView(novel: StoredNovel): BookView {
  return { id: novel.id, title: novel.title, author: novel.author, description: novel.description,
    date: novel.date, genre: novel.genre, genreKey: novel.genreKey, status: novel.status, publication: novel.publication,
    chapters: novel.chapters.map(chapter => ({ number: chapter.number, title: chapter.title, state: chapter.published ? "published" : "draft" })),
  };
}
