"use client";
import Link from "next/link";
import type { BookView } from "@/lib/definitions";
import { Icon } from "./Icons";
import { useLabels } from "./Labels";
export default function BookDetails({ novel, onEdit, onAddChapter, onMove, busy = false }: {
  novel: BookView; onEdit?: () => void; onAddChapter?: () => void; onMove?: (index: number, direction: number) => void; busy?: boolean;
}) {
  const t = useLabels();
  return <main className="book-page page-width">
    <Link className="breadcrumb" href="/"><Icon name="back" size={16} />{t.library}</Link>
    <div className="book-overview">
      <section className="book-introduction">
        <div className="book-kicker"><span className="genre-label">{novel.genre}</span>{novel.publication === "draft" && <span className="state-badge">{t.draft}</span>}</div>
        <h1>{novel.title}</h1><p className="book-author">{t.by} {novel.author}</p>
        <p className="book-description">{novel.description}</p>
        <div className="book-actions">
          {novel.chapters[0] && <Link className="button primary" href={`/novels/${novel.id}/chapter-${novel.chapters[0].number}/`}><Icon name="book" />{t.begin_reading}<Icon name="arrow" size={16} /></Link>}
          {onEdit && <button className="button" disabled={busy} onClick={onEdit}><Icon name="edit" size={16} />{t.edit_details}</button>}
        </div>
      </section>
      <aside className="book-facts" aria-label={t.novel_details}><div className="facts-heading"><Icon name="book" size={20} /><span>{t.novel_details}</span></div><dl>
        <div><dt>{t.status}</dt><dd><span className={`status-dot ${novel.status}`}>{t[novel.status]}</span></dd></div>
        <div><dt>{t.contents}</dt><dd>{novel.chapters.length} {t.chapters}</dd></div>
        <div><dt>{t.date_added}</dt><dd>{novel.date}</dd></div>
      </dl></aside>
    </div>
    <section className="book-contents">
      <header className="section-heading"><div><p className="eyebrow">{t.contents}</p><h2>{t.table_of_contents}</h2></div>{onAddChapter && <button className="button" disabled={busy} onClick={onAddChapter}><Icon name="plus" size={16} />{t.new_chapter}</button>}</header>
      {!novel.chapters.length ? <div className="empty-state"><h2>{t.no_chapters}</h2>{onAddChapter && <button className="button primary" onClick={onAddChapter}>{t.new_chapter}</button>}</div> : <ol className="chapter-table">{novel.chapters.map((chapter, index) => <li key={chapter.number}>
        <Link className="chapter-row" href={`/novels/${novel.id}/chapter-${chapter.number}/`}><span className="chapter-ordinal">{String(index + 1).padStart(2, "0")}</span><span className="chapter-row-title">{chapter.title}</span>{chapter.state && <span className={`state-badge ${chapter.state}`}>{t[chapter.state]}</span>}<Icon name="arrow" size={17} /></Link>
        {onMove && <div className="chapter-order"><button className="icon-button" aria-label={`${t.move_up}: ${chapter.title}`} disabled={busy || index === 0} onClick={() => onMove(index, -1)}><Icon name="up" size={16} /></button><button className="icon-button" aria-label={`${t.move_down}: ${chapter.title}`} disabled={busy || index === novel.chapters.length - 1} onClick={() => onMove(index, 1)}><Icon name="down" size={16} /></button></div>}
      </li>)}</ol>}
    </section>
  </main>;
}
