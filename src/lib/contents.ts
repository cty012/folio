import type { ChapterEntry, ContentsEntry, Novel, Volume } from "./definitions.ts";

/** A browsable slice of the contents: one volume, or a run of standalone chapters. */
export type ContentsSection = { key: string; volume?: Volume; numbers: number[] };

/**
 * Splits the contents into volumes and runs of standalone chapters. Long runs are cut into
 * evenly sized parts of at most `size` chapters so no single list grows unmanageably long.
 */
export function contentsSections(novel: Pick<Novel, "contents" | "chapters">, size = 50): ContentsSection[] {
  const sections: ContentsSection[] = [];
  let run: number[] = [];
  const flush = () => {
    const parts = Math.ceil(run.length / size), per = Math.ceil(run.length / Math.max(parts, 1));
    for (let start = 0; start < run.length; start += per) {
      const numbers = run.slice(start, start + per);
      sections.push({ key: `chapters-${numbers[0]}`, numbers });
    }
    run = [];
  };
  for (const entry of contentsOf(novel)) {
    if (entry.type === "chapter") { run.push(entry.number); continue; }
    flush();
    sections.push({ key: `volume-${entry.id}`, volume: entry, numbers: entry.chapters.map(chapter => chapter.number) });
  }
  flush();
  return sections;
}

export function flatContents(chapters: { number: number }[]): ChapterEntry[] {
  return chapters.map(({ number }) => ({ type: "chapter", number }));
}
export function contentsOf(novel: Pick<Novel, "contents" | "chapters">): ContentsEntry[] {
  return novel.contents ?? flatContents(novel.chapters);
}
export function chapterOrder(contents: ContentsEntry[]): number[] {
  return contents.flatMap(entry => entry.type === "chapter" ? [entry.number] : entry.chapters.map(chapter => chapter.number));
}
export function filterContents(contents: ContentsEntry[], numbers: Set<number>): ContentsEntry[] {
  return contents.flatMap((entry): ContentsEntry[] => {
    if (entry.type === "chapter") return numbers.has(entry.number) ? [entry] : [];
    const chapters = entry.chapters.filter(chapter => numbers.has(chapter.number));
    return chapters.length ? [{ ...entry, chapters }] : [];
  });
}
export function lastInVolume(novel: Pick<Novel, "contents" | "chapters">, number: number): boolean {
  return contentsOf(novel).some(entry => entry.type === "volume" && entry.chapters.length === 1 && entry.chapters[0].number === number);
}
