"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { BookView } from "@/lib/definitions";
import { contentsSections, type ContentsSection } from "@/lib/contents";
import { Icon } from "./Icons";
import { useLabels } from "./Labels";
import WordCount from "./WordCount";

/**
 * The novel's contents, one volume (or run of chapters) at a time. A rail lists the volumes,
 * the panel shows the chosen one as a compact grid, and the search box finds any chapter by
 * title or number across the whole novel.
 */
export default function ChapterBrowser({ novel, lastRead, onAddChapter, onOrganize, onDeleteChapter, busy = false }: {
  novel: BookView; lastRead: number | null;
  onAddChapter?: () => void; onOrganize?: () => void; onDeleteChapter?: (number: number) => void; busy?: boolean;
}) {
  const t = useLabels();
  const sections = useMemo(() => contentsSections(novel), [novel]);
  const position = useMemo(() => new Map(novel.chapters.map((chapter, index) => [chapter.number, index])), [novel.chapters]);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // A lone chapter between volumes (a prologue, an interlude) is a plain link in the rail, not a part to open.
  const single = (section: ContentsSection) => sections.length > 1 && !section.volume && section.numbers.length === 1;
  const parts = sections.filter(section => !single(section));
  // Open the part that holds the last chapter read, once it is known.
  useEffect(() => {
    const part = lastRead === null ? undefined : parts.find(section => section.numbers.includes(lastRead));
    if (part) setSelected(part.key);
  }, [lastRead]);
  const current = parts.find(section => section.key === selected) ?? parts[0];
  // On narrow screens the rail scrolls sideways; keep the open part in view without moving the page.
  const rail = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = rail.current, button = nav?.querySelector<HTMLElement>("[aria-current]");
    if (!nav || !button || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = Math.max(0, button.offsetLeft - (nav.clientWidth - button.offsetWidth) / 2);
  }, [current?.key]);
  const words = (numbers: number[]) => numbers.reduce((sum, number) => sum + (novel.chapters[position.get(number)!]?.wordCount ?? 0), 0);
  const ordinal = (number: number) => position.get(number)! + 1;
  function title(section: ContentsSection) {
    if (section.volume) return section.volume.title;
    if (section.numbers.length === 1) return novel.chapters[position.get(section.numbers[0])!].title;
    return t.chapter_range.replace("{from}", String(ordinal(section.numbers[0]))).replace("{to}", String(ordinal(section.numbers.at(-1)!)));
  }
  const sectionOf = (number: number) => sections.find(section => section.numbers.includes(number));

  const search = query.trim().toLocaleLowerCase();
  const asNumber = /^(?:第|chapter|ch\.?)?\s*(\d+)\s*章?$/.exec(search)?.[1];
  const results = search ? novel.chapters.filter((chapter, index) => chapter.title.toLocaleLowerCase().includes(search) || (asNumber !== undefined && index + 1 === Number(asNumber))) : [];

  function cell(number: number, showSection = false) {
    const chapter = novel.chapters[position.get(number)!];
    const bookmarked = lastRead === number;
    return <li key={number} className={bookmarked ? "chapter-cell last-read" : "chapter-cell"}>
      <Link className="chapter-link" href={`/novels/${novel.id}/chapter-${number}/`}>
        <span className="chapter-ordinal">{ordinal(number)}</span>
        <span className="chapter-name">
          <span className="chapter-title">{chapter.title}</span>
          {showSection && sections.length > 1 && !single(sectionOf(number)!) && <small>{title(sectionOf(number)!)}</small>}
        </span>
        {bookmarked && <span className="last-read-mark" title={t.last_read}><Icon name="bookmark" size={13} /><span>{t.last_read}</span></span>}
        {chapter.state === "draft" && <span className="state-badge draft">{t.draft}</span>}
        {chapter.state === "revised" && <span className="state-badge revised" title={t.revised_hint}>{t.revised}</span>}
        <span className="chapter-words"><WordCount count={chapter.wordCount ?? 0} /></span>
      </Link>
      {onDeleteChapter && <button className="icon-button chapter-delete" disabled={busy} aria-label={`${t.delete_chapter}: ${chapter.title}`} title={t.delete_chapter} onClick={() => onDeleteChapter(number)}><Icon name="trash" size={15} /></button>}
    </li>;
  }

  const tools = (novel.chapters.length > 0 || onAddChapter) && <div className="contents-toolbar">
    {novel.chapters.length > 1 && <label className="search-field contents-search">
      <Icon name="search" size={16} /><span className="sr-only">{t.find_chapter}</span>
      <input type="search" value={query} placeholder={t.find_chapter} onChange={event => setQuery(event.target.value)} />
    </label>}
    {(onOrganize || onAddChapter) && <div className="section-actions">
      {onOrganize && <button className="button" disabled={busy || !novel.chapters.length} onClick={onOrganize}><Icon name="list" size={15} />{t.organize_contents}</button>}
      {onAddChapter && <button className="button primary" disabled={busy} onClick={onAddChapter}><Icon name="plus" size={15} />{t.new_chapter}</button>}
    </div>}
  </div>;

  if (!novel.chapters.length) return <>{tools}<div className="empty-state contents-empty"><h2>{t.no_chapters}</h2></div></>;
  return <>
    {tools}
    {search ? <div className="contents-results">
      {results.length ? <ol className="chapter-grid" aria-label={t.find_chapter}>{results.map(chapter => cell(chapter.number, true))}</ol>
        : <p className="panel-empty">{t.no_matching_chapters}</p>}
    </div> : <div className={sections.length > 1 ? "contents-layout" : "contents-layout single"}>
      {sections.length > 1 && <nav className="volume-rail" aria-label={t.volumes} ref={rail}>
        <ol>{sections.map(section => <li key={section.key}>
          {single(section) ? <Link href={`/novels/${novel.id}/chapter-${section.numbers[0]}/`}>
            <span className="volume-rail-title">{title(section)}</span>
            <small>{t.chapter.replace("{number}", String(ordinal(section.numbers[0])))}{lastRead === section.numbers[0] && <Icon name="bookmark" size={11} />}</small>
          </Link> : <button aria-current={section.key === current.key ? "true" : undefined} onClick={() => setSelected(section.key)}>
            <span className="volume-rail-title">{title(section)}</span>
            <small>
              {t.chapter_count.replace("{count}", String(section.numbers.length))}
              {lastRead !== null && section.numbers.includes(lastRead) && <Icon name="bookmark" size={11} />}
            </small>
          </button>}
        </li>)}</ol>
      </nav>}
      {/* Every part is rendered so the whole contents stays in the page; only the chosen one shows. */}
      <div className="contents-panels">{parts.map(section => <section key={section.key} className="contents-panel" hidden={section.key !== current.key} aria-label={title(section)}>
        {(sections.length > 1 || section.volume) && <header className="contents-panel-heading">
          <h3>{title(section)}</h3>
          <p className="contents-panel-meta">{t.chapter_count.replace("{count}", String(section.numbers.length))} · <WordCount count={words(section.numbers)} /></p>
          {section.volume?.description && <p className="contents-panel-description">{section.volume.description}</p>}
        </header>}
        <ol className="chapter-grid">{section.numbers.map(number => cell(number))}</ol>
      </section>)}</div>
    </div>}
  </>;
}
