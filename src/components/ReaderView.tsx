"use client";
import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import type { BookView } from "@/lib/definitions";
import { Icon } from "./Icons";
import { useLabels } from "./Labels";
import WordCount from "./WordCount";
import { contentsOf } from "@/lib/contents";
import { lastReadKey } from "@/lib/appearance";
import { proseClass } from "@/lib/prose";

/** Novels longer than this open the contents rail with only the current volume expanded. */
const COLLAPSE_AFTER = 40;
const RAIL_GAP = 16;

export default function ReaderView({ novel, number, title, html, toolbar, editor, notice, wordCount, titleField }: {
  novel: BookView; number: number; title: string; html: string;
  toolbar?: React.ReactNode; editor?: React.ReactNode; notice?: React.ReactNode;
  wordCount?: number;
  /** Replaces the chapter heading while its title is being edited. */
  titleField?: React.ReactNode;
}) {
  const t = useLabels(); const index = novel.chapters.findIndex(chapter => chapter.number === number);
  const previous = novel.chapters[index - 1]; const next = novel.chapters[index + 1];
  const prose = useMemo(() => proseClass(html), [html]);
  const rail = useRef<HTMLElement>(null);
  const railList = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(lastReadKey(novel.id), String(number)); } catch { /* Bookmarks are optional. */ }
  }, [novel.id, number]);
  // Keep the whole rail inside the window: it starts below the header and, once the page
  // scrolls, sticks to the top. CSS alone cannot know the starting offset, so measure it.
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    let frame = 0;
    const fit = () => {
      frame = 0;
      const top = Math.max(element.getBoundingClientRect().top, RAIL_GAP);
      element.style.maxHeight = `${Math.max(window.innerHeight - top - RAIL_GAP, 200)}px`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(fit); };
    fit();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); cancelAnimationFrame(frame); };
  }, []);
  // Bring the current chapter into view inside the rail without scrolling the page.
  useEffect(() => {
    const list = railList.current, current = list?.querySelector<HTMLElement>("[aria-current='page']");
    if (!list || !current) return;
    const offset = current.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    list.scrollTop = Math.max(offset - list.clientHeight / 3, 0);
  }, [number]);

  const chapterLink = (number: number) => {
    const i = novel.chapters.findIndex(chapter => chapter.number === number); const chapter = novel.chapters[i];
    return <li key={`chapter-${number}`}><Link aria-current={number === novel.chapters[index]?.number ? "page" : undefined} href={`/novels/${novel.id}/chapter-${number}/`}><span>{i + 1}</span><span>{chapter.title}</span>{chapter.state === "draft" && <small>{t.draft}</small>}{chapter.state === "revised" && <small className="revised" title={t.revised_hint}>{t.revised}</small>}</Link></li>;
  };
  const collapse = novel.chapters.length > COLLAPSE_AFTER;
  const contents = (id: string) => <nav aria-label={t.contents} id={id}><ol>{contentsOf(novel).map(entry => entry.type === "chapter" ? chapterLink(entry.number) : <li className="reader-volume" key={`volume-${entry.id}`}>
    <details open={!collapse || entry.chapters.some(chapter => chapter.number === number)}>
      <summary><Icon name="down" size={14} /><span>{entry.title}</span><small>{entry.chapters.length}</small></summary>
      <ol>{entry.chapters.map(chapter => chapterLink(chapter.number))}</ol>
    </details>
  </li>)}</ol></nav>;
  const position = <span className="reader-position">{index + 1} / {novel.chapters.length}</span>;

  return <main className="reader-page">
    <div className="reader-progress" aria-hidden="true" />
    <div className="reader-layout page-width">
      <aside className="reader-sidebar" ref={rail}>
        <Link className="rail-novel" href={`/novels/${novel.id}/`}><Icon name="back" size={15} /><span>{novel.title}</span></Link>
        <div className="rail-heading"><p className="eyebrow">{t.contents}</p>{position}</div>
        <div className="rail-list" ref={railList}>{contents("reader-contents")}</div>
      </aside>
      <section className="reader-main">
        <div className="reader-bar">
          <Link className="breadcrumb" href={`/novels/${novel.id}/`}><Icon name="back" size={16} /><span>{novel.title}</span></Link>
          {position}
        </div>
        <details className="mobile-contents"><summary><Icon name="list" size={16} />{t.contents}</summary>{contents("mobile-contents")}</details>
        {(toolbar || notice) && <div className={editor ? "reader-tools editing" : "reader-tools"}>{toolbar && <div className="reader-toolbar">{toolbar}</div>}{notice}</div>}
        <div className="reader-paper">
          <header className="chapter-heading">
            <p className="eyebrow">{t.chapter.replace("{number}", String(index + 1))}</p>
            {titleField ?? <h1>{title}</h1>}
            <span className="chapter-rule" />
            <p className="reader-word-count"><WordCount count={wordCount ?? novel.chapters[index]?.wordCount ?? 0} /></p>
          </header>
          {editor || <article className={prose} dangerouslySetInnerHTML={{ __html: html }} />}
        </div>
        <footer className="reader-pagination">
          {previous ? <Link href={`/novels/${novel.id}/chapter-${previous.number}/`}><Icon name="back" size={18} /><span><small>{t.previous_chapter}</small><strong>{previous.title}</strong></span></Link> : <span />}
          {next ? <Link className="next-chapter" href={`/novels/${novel.id}/chapter-${next.number}/`}><span><small>{t.next_chapter}</small><strong>{next.title}</strong></span><Icon name="arrow" size={18} /></Link> : <Link className="next-chapter" href={`/novels/${novel.id}/`}><span><small>{t.end_novel}</small><strong>{t.back_contents}</strong></span><Icon name="list" size={18} /></Link>}
        </footer>
      </section>
    </div>
  </main>;
}
