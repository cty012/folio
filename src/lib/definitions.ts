export type NovelStatus = "ongoing" | "completed" | "on-hiatus";

export type Chapter = {
  /** Stable route/file identity. Array position determines reading order. */
  number: number;
  title: string;
};

export type StoredChapter = Chapter & {
  contentFile: string;
  published: { title: string; contentFile: string } | null;
};

export type StoredNovel = Omit<Novel, "chapters"> & {
  publication: "draft" | "published";
  genreKey?: string;
  chapters: StoredChapter[];
};

export type WorkspaceNovel = Omit<StoredNovel, "chapters"> & {
  revision: string;
  chapters: (StoredChapter & { markdown: string })[];
};

export type Novel = {
  id: string;
  title: string;
  genre: string;
  author: string;
  date: string;  // Format: YYYY-MM-DD
  description: string;
  status: NovelStatus;
  chapters: Chapter[];
};

export type BookView = Omit<Novel, "chapters"> & {
  publication?: "draft" | "published";
  genreKey?: string;
  chapters: (Chapter & { state?: "draft" | "published" })[];
};
export type GenreState = { genres: { id: string; name: string }[]; revision: string };
