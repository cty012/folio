"use client";
import Link from "next/link";
import type { BookView } from "@/lib/definitions";
import { Icon } from "./Icons";
import { useLabels } from "./Labels";
export default function ReaderView({ novel, number, title, html, toolbar, editor, notice }: {
  novel: BookView; number: number; title: string; html: string;
  toolbar?: React.ReactNode; editor?: React.ReactNode; notice?: React.ReactNode;
}) {
  const t = useLabels(); const index = novel.chapters.findIndex(chapter => chapter.number === number);
  const previous = novel.chapters[index - 1]; const next = novel.chapters[index + 1];
  const contents = <nav aria-label={t.contents}><ol>{novel.chapters.map((chapter, i) => <li key={chapter.number}><Link aria-current={chapter.number === number ? "page" : undefined} href={`/novels/${novel.id}/chapter-${chapter.number}/`}><span>{String(i + 1).padStart(2, "0")}</span><span>{chapter.title}</span>{chapter.state === "draft" && <small>{t.draft}</small>}</Link></li>)}</ol></nav>;
  return <main className="reader-page page-width">
    <div className="reader-breadcrumb"><Link className="breadcrumb" href={`/novels/${novel.id}/`}><Icon name="back" size={16} /><span>{novel.title}</span></Link><span className="muted">{index + 1} / {novel.chapters.length}</span></div>
    <div className="reader-layout">
      <aside className="reader-sidebar"><p className="eyebrow">{t.contents}</p><Link className="reader-book-title" href={`/novels/${novel.id}/`}>{novel.title}</Link>{contents}</aside>
      <section className="reader-main">
        <details className="mobile-contents"><summary><Icon name="list" size={17} />{t.contents}</summary>{contents}</details>
        {toolbar && <div className="reader-tools">{toolbar}</div>}{notice}
        <div className="reader-paper">
          <header className="chapter-heading"><p className="eyebrow">{t.chapter.replace("{number}", String(index + 1))}</p><h1>{title}</h1><span className="chapter-rule" /></header>
          {editor || <article className="prose prose-slate dark:prose-invert reader-prose" dangerouslySetInnerHTML={{ __html: html }} />}
        </div>
        <footer className="reader-pagination">
          {previous ? <Link href={`/novels/${novel.id}/chapter-${previous.number}/`}><Icon name="back" size={18} /><span><small>{t.previous_chapter}</small><strong>{previous.title}</strong></span></Link> : <span />}
          {next ? <Link className="next-chapter" href={`/novels/${novel.id}/chapter-${next.number}/`}><span><small>{t.next_chapter}</small><strong>{next.title}</strong></span><Icon name="arrow" size={18} /></Link> : <Link className="next-chapter" href={`/novels/${novel.id}/`}><span><small>{t.end_novel}</small><strong>{t.back_contents}</strong></span><Icon name="list" size={18} /></Link>}
        </footer>
      </section>
    </div>
  </main>;
}
