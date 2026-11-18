export type NovelStatus = "ongoing" | "completed" | "on-hiatus";
export type ChapterEntry = { type: "chapter"; number: number };
export type Volume = { type: "volume"; id: string; title: string; description: string; chapters: ChapterEntry[] };
export type ContentsEntry = ChapterEntry | Volume;

export type NovelCharacter = {
  /** Stable identity used by relationships. Assigned on load when a hand-written profile has none. */
  id: string;
  name: string;
  role: string;
  introduction: string;
  /** Name of one of the novel's character categories. Omitted when uncategorized. */
  category?: string;
};

/** A labelled link between two characters: "{from} is {to}'s {label}", or both ways when mutual. */
export type CharacterRelation = { from: string; to: string; label: string; mutual?: boolean };

export type Chapter = {
  /** Stable route/file identity. Loaded chapter arrays follow the flattened reading order. */
  number: number;
  title: string;
  /** Derived from chapter text; never stored in index.json. */
  wordCount?: number;
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
  chapters: (StoredChapter & {
    markdown: string;
    publishedWordCount: number | null;
    /** True when a published chapter's saved title or text differs from its published snapshot. */
    unpublishedChanges: boolean;
  })[];
};

export type Novel = {
  id: string;
  title: string;
  genre: string;
  author: string;
  date: string;  // Format: YYYY-MM-DD
  description: string;
  status: NovelStatus;
  characters?: NovelCharacter[];
  /** Display order of character categories. */
  characterCategories?: string[];
  characterRelations?: CharacterRelation[];
  contents?: ContentsEntry[];
  chapters: Chapter[];
};

export type BookView = Omit<Novel, "chapters"> & {
  publication?: "draft" | "published";
  genreKey?: string;
  /** CMS only: "revised" is a published chapter whose saved draft has changed since publishing. */
  chapters: (Chapter & { state?: "draft" | "published" | "revised" })[];
};
export type GenreState = { genres: { id: string; name: string }[]; revision: string };
