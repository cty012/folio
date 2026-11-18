import type { BookView, StoredChapter, StoredNovel } from "./definitions";
export function bookView(novel: Omit<StoredNovel, "chapters"> & { chapters: (StoredChapter & { unpublishedChanges?: boolean })[] }): BookView {
  return { id: novel.id, title: novel.title, author: novel.author, description: novel.description,
    date: novel.date, genre: novel.genre, genreKey: novel.genreKey, status: novel.status, publication: novel.publication,
    characters: novel.characters ?? [],
    characterCategories: novel.characterCategories ?? [],
    characterRelations: novel.characterRelations ?? [],
    contents: novel.contents,
    chapters: novel.chapters.map(chapter => ({ number: chapter.number, title: chapter.title, wordCount: chapter.wordCount,
      state: !chapter.published ? "draft" : chapter.unpublishedChanges ? "revised" : "published" })),
  };
}
