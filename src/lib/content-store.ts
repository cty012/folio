import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { countWords } from "./word-count.ts";
import { chapterOrder, contentsOf, filterContents } from "./contents.ts";
import type { ContentsEntry } from "./definitions.ts";
import type { StoredNovel, WorkspaceNovel, GenreState, NovelCharacter, CharacterRelation } from "./definitions.ts";

export class ContentError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function dataDirectory() {
  return path.resolve(process.env.FOLIO_DATA_DIR || path.join(process.cwd(), "data"));
}

function safePath(...parts: string[]) {
  const root = dataDirectory();
  let current = root;
  // Never follow symlinks below the chosen data directory.
  for (const part of parts) {
    for (const segment of part.split("/")) {
      if (!segment || segment === "." || segment === ".." || segment.includes("\\"))
        throw new ContentError("Invalid content path.");
      current = path.join(current, segment);
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
        throw new ContentError("Content paths must not contain symbolic links.");
    }
  }
  return current;
}

function identifier(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(value))
    throw new ContentError("Use letters, numbers, hyphens, or underscores for a novel ID.");
  return value;
}

function text(value: unknown, name: string, max = 200, empty = false): string {
  if (typeof value !== "string" || (!empty && !value.trim()) || value.length > max)
    throw new ContentError(`${name} must be ${empty ? "at most" : "between 1 and"} ${max.toLocaleString()} characters.`);
  return value;
}

function contentFile(value: unknown): string {
  if (typeof value !== "string" || !/^(chapter-[1-9]\d*\.md|revisions\/[a-f0-9-]+\.md)$/.test(value))
    throw new ContentError("Invalid chapter file reference.");
  return value;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContentError("Expected an object.");
  return value as Record<string, unknown>;
}

type Cast = { characters: NovelCharacter[]; categories: string[]; relations: CharacterRelation[] };

/** Validates character profiles together with their categories and relationships. */
function cast(rawCharacters: unknown, rawCategories: unknown = [], rawRelations: unknown = []): Cast {
  if (!Array.isArray(rawCharacters) || rawCharacters.length > 100) throw new ContentError("Characters must be a list of at most 100 profiles.");
  if (!Array.isArray(rawCategories) || rawCategories.length > 50) throw new ContentError("Character categories must be a list of at most 50 names.");
  if (!Array.isArray(rawRelations) || rawRelations.length > 500) throw new ContentError("Character relationships must be a list of at most 500 links.");
  const categories: string[] = [];
  for (const value of rawCategories) {
    const name = text(value, "Category name", 100).trim();
    if (categories.includes(name)) throw new ContentError("Character category names must be unique.");
    categories.push(name);
  }
  const ids = new Set<string>();
  const characters = rawCharacters.map(value => {
    const character = record(value);
    let id = "";
    if (character.id !== undefined) {
      if (typeof character.id !== "string" || !/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(character.id)) throw new ContentError("Use letters, numbers, hyphens, or underscores for a character ID.");
      if (ids.has(character.id)) throw new ContentError("Character IDs must be unique.");
      id = character.id; ids.add(id);
    }
    const category = character.category == null ? "" : text(character.category, "Character category", 100, true).trim();
    // A category used by a character but missing from the list joins the end of it.
    if (category && !categories.includes(category)) {
      if (categories.length >= 50) throw new ContentError("Character categories must be a list of at most 50 names.");
      categories.push(category);
    }
    return {
      id, name: text(character.name, "Character name").trim(),
      role: text(character.role ?? "", "Character role", 200, true).trim(),
      introduction: text(character.introduction ?? "", "Character introduction", 10000, true),
      ...(category ? { category } : {}),
    };
  });
  // Hand-written profiles may omit IDs; derive stable ones that avoid explicit IDs.
  let next = 1;
  for (const character of characters) {
    if (character.id) continue;
    while (ids.has(`character-${next}`)) next++;
    character.id = `character-${next}`; ids.add(character.id);
  }
  const relations = rawRelations.map(value => {
    const relation = record(value);
    const { from, to } = relation;
    if (typeof from !== "string" || typeof to !== "string" || !ids.has(from) || !ids.has(to))
      throw new ContentError("Each relationship must connect two existing characters.");
    if (from === to) throw new ContentError("A relationship must connect two different characters.");
    if (relation.mutual !== undefined && typeof relation.mutual !== "boolean") throw new ContentError("Invalid relationship direction.");
    const label = text(relation.label, "Relationship", 60).trim();
    return relation.mutual ? { from, to, label, mutual: true } : { from, to, label };
  });
  return { characters, categories, relations };
}

function normalizeContents(value: unknown, numbers: number[]): ContentsEntry[] {
  if (!Array.isArray(value)) throw new ContentError("Contents must be an ordered list.");
  const seen = new Set<number>(); const volumes = new Set<string>();
  const chapter = (value: unknown) => {
    const raw = record(value);
    if (raw.type !== "chapter" || typeof raw.number !== "number" || !numbers.includes(raw.number) || seen.has(raw.number))
      throw new ContentError("Contents must reference every chapter exactly once, with no nested volumes.");
    seen.add(raw.number);
    return { type: "chapter" as const, number: raw.number };
  };
  const contents = value.map((value): ContentsEntry => {
    const raw = record(value);
    if (raw.type === "chapter") return chapter(raw);
    if (raw.type !== "volume") throw new ContentError("Unknown contents entry.");
    const id = identifier(raw.id);
    if (volumes.has(id)) throw new ContentError("Volume IDs must be unique.");
    volumes.add(id);
    if (!Array.isArray(raw.chapters) || !raw.chapters.length) throw new ContentError("A volume must contain at least one chapter.");
    return { type: "volume", id, title: text(raw.title, "Volume title").trim(), description: text(raw.description ?? "", "Volume description", 10000, true), chapters: raw.chapters.map(chapter) };
  });
  if (seen.size !== numbers.length) throw new ContentError("Contents must reference every chapter exactly once.");
  return contents;
}

function normalize(value: unknown, id: string): StoredNovel {
  const raw = record(value);
  if (!Array.isArray(raw.chapters)) throw new ContentError("Missing chapter list.");
  if (!["ongoing", "completed", "on-hiatus"].includes(String(raw.status))) throw new ContentError("Invalid novel status.");
  if (raw.publication !== undefined && !["draft", "published"].includes(String(raw.publication)))
    throw new ContentError("Invalid publication state.");
  const seen = new Set<number>();
  const chapters = raw.chapters.map(value => {
    const chapter = record(value);
    const number = chapter.number;
    if (typeof number !== "number" || !Number.isSafeInteger(number) || number < 1 || seen.has(number))
      throw new ContentError("Chapter numbers must be unique positive integers.");
    seen.add(number);
    const title = text(chapter.title, "Chapter title");
    const file = contentFile(chapter.contentFile ?? `chapter-${number}.md`);
    // Existing hand-authored novels are published until explicitly changed in the CMS.
    const published = chapter.published === undefined ? { title, contentFile: file }
      : chapter.published === null ? null : {
        title: text(record(chapter.published).title, "Published chapter title"),
        contentFile: contentFile(record(chapter.published).contentFile),
      };
    return { number, title, contentFile: file, published };
  });
  const contents = raw.contents === undefined ? undefined : normalizeContents(raw.contents, chapters.map(chapter => chapter.number));
  const ordered = contents ? chapterOrder(contents).map(number => chapters.find(chapter => chapter.number === number)!) : chapters;
  return withCast({
    id, title: text(raw.title, "Title"), author: text(raw.author, "Author"),
    genreKey: text(raw.genreKey ?? raw.genre, "Genre key"),
    genre: genreName(text(raw.genreKey ?? raw.genre, "Genre key")), description: text(raw.description, "Description", 10000, true),
    date: text(raw.date, "Date", 40), status: raw.status as StoredNovel["status"],
    characters: [], // Placeholder that keeps the key's position in index.json.
    publication: (raw.publication ?? "published") as StoredNovel["publication"], chapters: ordered,
    ...(contents ? { contents } : {}),
  }, cast(raw.characters ?? [], raw.characterCategories ?? [], raw.characterRelations ?? []));
}

/** Stores a validated cast, leaving empty category and relationship lists out of index.json. */
function withCast(novel: StoredNovel, { characters, categories, relations }: Cast): StoredNovel {
  const result: StoredNovel = { ...novel, characters };
  delete result.characterCategories; delete result.characterRelations;
  if (categories.length) result.characterCategories = categories;
  if (relations.length) result.characterRelations = relations;
  return result;
}

export function readNovel(id: string): StoredNovel | undefined {
  identifier(id);
  recoverPending(id);
  const file = safePath("novels", id, "index.json");
  if (!fs.existsSync(file)) return undefined;
  try { return normalize(JSON.parse(fs.readFileSync(file, "utf8")), id); }
  catch (error) { throw new ContentError(`${id}/index.json: ${(error as Error).message}`); }
}

export function listNovels(): StoredNovel[] {
  const directory = safePath("novels");
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith("."))
    .map(entry => readNovel(entry.name)).filter((novel): novel is StoredNovel => !!novel);
}

export function readMarkdown(id: string, file: string): string {
  try { return fs.readFileSync(safePath("novels", identifier(id), contentFile(file)), "utf8"); }
  catch (error) { throw new ContentError(`${id}/${file}: ${(error as Error).message}`); }
}

export function workspaceNovel(id: string): WorkspaceNovel {
  const novel = readNovel(id);
  if (!novel) throw new ContentError("Novel not found.", 404);
  const hash = createHash("sha256").update(JSON.stringify(novel));
  const chapters = novel.chapters.map(chapter => {
    const markdown = readMarkdown(id, chapter.contentFile);
    hash.update(JSON.stringify([chapter.number, markdown]));
    const publishedMarkdown = chapter.published ? readMarkdown(id, chapter.published.contentFile) : null;
    if (publishedMarkdown !== null) hash.update(publishedMarkdown);
    const unpublishedChanges = !!chapter.published && (chapter.published.title !== chapter.title || publishedMarkdown !== markdown);
    return { ...chapter, markdown, wordCount: countWords(markdown), publishedWordCount: publishedMarkdown === null ? null : countWords(publishedMarkdown), unpublishedChanges };
  });
  return { ...novel, chapters, revision: hash.digest("hex") };
}

function writeDurably(file: string, value: string) {
  const descriptor = fs.openSync(file, "wx", 0o600);
  try { fs.writeFileSync(descriptor, value); fs.fsyncSync(descriptor); }
  finally { fs.closeSync(descriptor); }
}

function snapshot(id: string, markdown: string) {
  fs.mkdirSync(safePath("novels", id, "revisions"), { recursive: true });
  const file = `revisions/${createHash("sha256").update(markdown).digest("hex")}.md`;
  const target = safePath("novels", id, file);
  if (!fs.existsSync(target)) atomicWrite(target, markdown);
  else if (fs.readFileSync(target, "utf8") !== markdown) throw new ContentError("A retained snapshot was modified. Restore it from backup before saving.");
  return file;
}

function atomicWrite(file: string, value: string) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    writeDurably(temporary, value);
    fs.renameSync(temporary, file);
    const descriptor = fs.openSync(path.dirname(file), "r");
    try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

type DraftWrite = { file: string; markdown: string };

function finishPending(id: string) {
  const pending = safePath("novels", id, ".pending.json");
  const transaction = record(JSON.parse(fs.readFileSync(pending, "utf8")));
  const novel = normalize(transaction.novel, id);
  if (!Array.isArray(transaction.writes)) throw new ContentError("Invalid recovery journal.");
  for (const value of transaction.writes) {
    const write = record(value);
    const file = contentFile(write.file);
    if (!/^chapter-[1-9]\d*\.md$/.test(file)) throw new ContentError("Invalid draft recovery path.");
    atomicWrite(safePath("novels", id, file), text(write.markdown, "Chapter content", 2_000_000, true));
  }
  atomicWrite(safePath("novels", id, "index.json"), JSON.stringify(novel, null, 2) + "\n");
  fs.unlinkSync(pending);
}

function recoverPending(id: string) {
  if (!fs.existsSync(safePath("novels", id, ".pending.json"))) return;
  const lock = safePath("novels", id, ".write-lock");
  if (fs.existsSync(lock)) throw new ContentError("A save is incomplete or still running. See README recovery instructions before removing the write lock.", 409);
  fs.mkdirSync(lock);
  try { finishPending(id); } finally { fs.rmdirSync(lock); }
}

function commit(novel: StoredNovel, writes: DraftWrite[] = []) {
  const index = safePath("novels", novel.id, "index.json");
  if (fs.existsSync(index)) {
    const old = normalize(JSON.parse(fs.readFileSync(index, "utf8")), novel.id);
    // History points to immutable plain-text content, never mutable draft files.
    for (const chapter of old.chapters) {
      chapter.contentFile = snapshot(novel.id, readMarkdown(novel.id, chapter.contentFile));
      if (chapter.published) chapter.published.contentFile = snapshot(novel.id, readMarkdown(novel.id, chapter.published.contentFile));
    }
    const history = safePath("novels", novel.id, "history");
    fs.mkdirSync(history, { recursive: true });
    atomicWrite(path.join(history, `${Date.now()}-${randomUUID()}.json`), JSON.stringify(old, null, 2) + "\n");
  }
  // Durable intent makes a multi-file save recoverable after interruption.
  atomicWrite(safePath("novels", novel.id, ".pending.json"), JSON.stringify({ novel, writes }));
  finishPending(novel.id);
}

export type Mutation = Record<string, unknown>;

export function deleteNovel(input: Mutation): { deleted: true; id: string } {
  const id = identifier(input.id);
  if (!readNovel(id)) throw new ContentError("Novel not found.", 404);
  let lock = safePath("novels", id, ".write-lock");
  try { fs.mkdirSync(lock); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new ContentError("This novel is being saved. Retry shortly.", 409);
    throw error;
  }
  try {
    if (input.revision !== workspaceNovel(id).revision)
      throw new ContentError("This novel changed in another tab or editor. Reload before deleting it.", 409);
    const trash = safePath(".trash", "novels");
    fs.mkdirSync(trash, { recursive: true });
    const destination = safePath(".trash", "novels", `${id}--${randomUUID()}`);
    // One atomic move retains the complete manuscript, snapshots and history.
    fs.renameSync(safePath("novels", id), destination);
    lock = path.join(destination, ".write-lock");
    for (const directory of [safePath("novels"), trash]) {
      const descriptor = fs.openSync(directory, "r");
      try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
    }
    return { deleted: true, id };
  } finally { fs.rmdirSync(lock); }
}

export function mutateContent(input: Mutation): WorkspaceNovel {
  if (input.action === "createNovel") {
    const title = text(input.title, "Title").trim();
    const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0,65) || "novel"}-${randomUUID().slice(0,8)}`;
    const novel: StoredNovel = {
      id, title, author: text(input.author, "Author").trim(),
      genreKey: text(input.genreKey || input.genre || "Uncategorized", "Genre"),
      genre: genreName(text(input.genreKey || input.genre || "Uncategorized", "Genre")),
      description: text(input.description || "", "Description", 10000, true),
      date: new Date().toISOString().slice(0,10), status: "ongoing", publication: "draft", chapters: [],
    };
    fs.mkdirSync(safePath("novels"), { recursive: true });
    fs.mkdirSync(safePath("novels", id));
    commit(novel);
    return workspaceNovel(id);
  }
  const id = identifier(input.id);
  if (!readNovel(id)) throw new ContentError("Novel not found.", 404);
  const lock = safePath("novels", id, ".write-lock");
  try { fs.mkdirSync(lock); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new ContentError("This novel is being saved. Retry shortly. If Folio stopped during a save, see the recovery instructions in README.", 409);
    throw error;
  }
  try {
    const current = workspaceNovel(id);
    if (input.revision !== current.revision)
      throw new ContentError("This novel changed in another tab or editor. Copy your unsaved text, then reload the latest version.", 409);
    let novel = readNovel(id)!;
    const writes: DraftWrite[] = [];
    if (input.action === "updateNovel") {
      novel.title = text(input.title, "Title").trim();
      novel.author = text(input.author, "Author").trim();
      novel.description = text(input.description, "Description", 10000, true);
      novel.genreKey = text(input.genreKey || novel.genreKey || novel.genre, "Genre");
      novel.genre = genreName(novel.genreKey);
      if (!["ongoing", "completed", "on-hiatus"].includes(String(input.status))) throw new ContentError("Invalid novel status.");
      novel.status = input.status as StoredNovel["status"];
    } else if (input.action === "updateCharacters") {
      // Categories and relationships are optional; omitted ones are kept, minus links to removed characters.
      const kept = new Set(Array.isArray(input.characters) ? input.characters.map(character => (character as Record<string, unknown>)?.id) : []);
      const relations = input.relations ?? (novel.characterRelations ?? []).filter(relation => kept.has(relation.from) && kept.has(relation.to));
      novel = withCast(novel, cast(input.characters, input.categories ?? novel.characterCategories ?? [], relations));
    } else if (input.action === "updateContents") {
      novel.contents = normalizeContents(input.contents, novel.chapters.map(chapter => chapter.number));
    } else if (input.action === "createChapter") {
      let number = Math.max(0, ...novel.chapters.map(chapter => chapter.number)) + 1;
      while (fs.existsSync(safePath("novels", id, `chapter-${number}.md`))) number++;
      if (!Number.isSafeInteger(number)) throw new ContentError("No chapter IDs remain available.");
      if (input.volumeId || input.newVolumeTitle || novel.contents) {
        const contents = contentsOf(novel);
        const entry = { type: "chapter" as const, number };
        if (input.newVolumeTitle) {
          contents.push({ type: "volume", id: randomUUID(), title: text(input.newVolumeTitle, "Volume title").trim(), description: "", chapters: [entry] });
        } else if (input.volumeId) {
          const volume = contents.find(entry => entry.type === "volume" && entry.id === input.volumeId);
          if (!volume || volume.type !== "volume") throw new ContentError("Volume not found.", 404);
          volume.chapters.push(entry);
        } else contents.push(entry);
        novel.contents = contents;
      }
      novel.chapters.push({ number, title: text(input.title, "Chapter title"), contentFile: `chapter-${number}.md`, published: null });
      writes.push({ file: `chapter-${number}.md`, markdown: "" });
    } else if (input.action === "reorder") {
      if (novel.contents?.some(entry => entry.type === "volume")) throw new ContentError("Use the contents organizer to move chapters in volumes.");
      const order = input.order;
      if (!Array.isArray(order) || order.length !== novel.chapters.length || new Set(order).size !== order.length || order.some(number => !novel.chapters.some(chapter => chapter.number === number)))
        throw new ContentError("Order must contain every chapter exactly once.");
      novel.chapters = order.map(number => novel.chapters.find(chapter => chapter.number === number)!);
      if (novel.contents) novel.contents = novel.chapters.map(chapter => ({ type: "chapter", number: chapter.number }));
    } else {
      const chapter = novel.chapters.find(chapter => chapter.number === input.number);
      if (!chapter) throw new ContentError("Chapter not found.", 404);
      if (input.action === "saveChapter") {
        const title = text(input.title, "Chapter title");
        const markdown = text(input.markdown, "Chapter content", 2_000_000, true);
        if (chapter.published) chapter.published.contentFile = snapshot(id, readMarkdown(id, chapter.published.contentFile));
        chapter.title = title;
        chapter.contentFile = `chapter-${chapter.number}.md`;
        writes.push({ file: chapter.contentFile, markdown });
      } else if (input.action === "publishChapter") {
        // Freeze publication bytes, even for legacy files edited outside Folio.
        chapter.published = { title: chapter.title, contentFile: snapshot(id, readMarkdown(id, chapter.contentFile)) };
        novel.publication = "published";
      } else if (input.action === "unpublishChapter") {
        chapter.published = null;
        if (!novel.chapters.some(item => item.published)) novel.publication = "draft";
      } else if (input.action === "deleteChapter") {
        // Retain Markdown and reserve this route ID even for snapshot-only indexes.
        const retainedFile = `chapter-${chapter.number}.md`;
        if (!fs.existsSync(safePath("novels", id, retainedFile)))
          writes.push({ file: retainedFile, markdown: readMarkdown(id, chapter.contentFile) });
        novel.chapters = novel.chapters.filter(item => item.number !== chapter.number);
        if (novel.contents) novel.contents = filterContents(novel.contents, new Set(novel.chapters.map(chapter => chapter.number)));
        if (!novel.chapters.some(item => item.published)) novel.publication = "draft";
      } else throw new ContentError("Unknown action.");
    }
    commit(novel, writes);
    return workspaceNovel(id);
  } finally { fs.rmdirSync(lock); }
}


function genreNames(): Record<string, string> {
  const file = safePath("genres.json");
  if (!fs.existsSync(file)) return Object.create(null);
  const result: Record<string, string> = Object.create(null);
  for (const [id, name] of Object.entries(record(JSON.parse(fs.readFileSync(file, "utf8"))))) {
    result[text(id, "Genre key")] = text(name, "Genre name");
  }
  return result;
}
function genreName(id: string) { return genreNames()[id] ?? id; }

export function listGenres(): GenreState {
  const names = genreNames();
  for (const novel of listNovels()) names[novel.genreKey ?? novel.genre] ??= novel.genre;
  const genres = Object.entries(names).map(([id, name]) => ({ id, name })).sort((a, b) => a.id.localeCompare(b.id));
  return { genres, revision: createHash("sha256").update(JSON.stringify(genres)).digest("hex") };
}

export function mutateGenres(input: Mutation): GenreState {
  fs.mkdirSync(dataDirectory(), { recursive: true });
  const lock = safePath(".genres-lock");
  try { fs.mkdirSync(lock); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new ContentError("Genres are being saved. Retry shortly.", 409);
    throw error;
  }
  try {
    const current = listGenres();
    if (current.revision !== input.revision) throw new ContentError("Genres changed. Reload the library before saving.", 409);
    const name = text(input.name, "Genre name").trim();
    const id = input.action === "createGenre" ? name : text(input.genreId, "Genre key");
    if (input.action !== "createGenre" && input.action !== "renameGenre") throw new ContentError("Unknown genre action.");
    if (input.action === "renameGenre" && !current.genres.some(genre => genre.id === id)) throw new ContentError("Genre not found.", 404);
    if (current.genres.some(genre => (genre.id !== id || input.action === "createGenre") && (genre.name.toLocaleLowerCase() === name.toLocaleLowerCase() || genre.id === id))) throw new ContentError("That genre already exists.");
    const names: Record<string, string> = Object.create(null);
    for (const genre of current.genres) names[genre.id] = genre.name;
    names[id] = name;
    const file = safePath("genres.json");
    if (fs.existsSync(file)) {
      fs.mkdirSync(safePath("genre-history"), { recursive: true });
      atomicWrite(safePath("genre-history", `${Date.now()}-${randomUUID()}.json`), fs.readFileSync(file, "utf8"));
    }
    atomicWrite(file, JSON.stringify(names, null, 2) + "\n");
    return listGenres();
  } finally { fs.rmdirSync(lock); }
}
