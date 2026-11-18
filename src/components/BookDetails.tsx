"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BookView, NovelCharacter } from "@/lib/definitions";
import { lastReadKey } from "@/lib/appearance";
import BookCover from "./BookCover";
import ChapterBrowser from "./ChapterBrowser";
import CharacterSection from "./CharacterSection";
import Clamp from "./Clamp";
import { Icon } from "./Icons";
import { useLabels } from "./Labels";
import RelationGraph from "./RelationGraph";
import WordCount from "./WordCount";
import Menu from "./cms/Menu";

type Tab = "contents" | "characters" | "relationships";

export default function BookDetails({ novel, onEdit, onAddChapter, onEditCharacter, onReorderCharacters, onManageCategories, onEditRelation, onAddRelation, onDeleteNovel, onDeleteChapter, onOrganize, busy = false }: {
  novel: BookView; onEdit?: () => void; onAddChapter?: () => void; busy?: boolean;
  onEditCharacter?: (index: number | null) => void; onReorderCharacters?: (characters: NovelCharacter[]) => void;
  onManageCategories?: () => void;
  onAddRelation?: (from?: string) => void; onEditRelation?: (index: number) => void;
  onOrganize?: () => void;
  onDeleteNovel?: () => void; onDeleteChapter?: (number: number) => void;
}) {
  const t = useLabels();
  const characters = novel.characters ?? [];
  const relations = novel.characterRelations ?? [];
  const editing = !!onEditCharacter;
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "contents", label: t.contents, count: novel.chapters.length },
    ...(characters.length || editing ? [{ id: "characters" as const, label: t.characters_tab, count: characters.length }] : []),
    ...(relations.length || editing ? [{ id: "relationships" as const, label: t.relationships, count: relations.length }] : []),
  ];
  const [tab, setTab] = useState<Tab>("contents");
  const [focus, setFocus] = useState<string | null>(null);
  const [lastRead, setLastRead] = useState<number | null>(null);

  useEffect(() => {
    const fromHash = () => {
      const hash = location.hash.slice(1);
      setTab(tabs.some(item => item.id === hash) ? hash as Tab : "contents");
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
    // The available tabs only change when characters appear or disappear.
  }, [tabs.length]);
  // Keep the address in step with the open tab; saving refreshes the page data and drops the hash.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const hash = tab === "contents" ? "" : `#${tab}`;
    if (location.hash !== hash) history.replaceState(history.state, "", location.pathname + location.search + hash);
  });
  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(lastReadKey(novel.id)); } catch { /* No bookmark. */ }
    const number = Number(stored);
    setLastRead(stored && novel.chapters.some(chapter => chapter.number === number) ? number : null);
  }, [novel.id, novel.chapters]);

  function choose(next: Tab) {
    setTab(next);
    history.replaceState(history.state, "", location.pathname + location.search + (next === "contents" ? "" : `#${next}`));
  }
  function showRelations(id: string) { setFocus(id); choose("relationships"); }

  const total = novel.chapters.reduce((sum, chapter) => sum + (chapter.wordCount ?? 0), 0);
  const resume = lastRead === null ? undefined : novel.chapters.find(chapter => chapter.number === lastRead);
  const start = resume ?? novel.chapters[0];

  return <main className="book-page page-width">
    <Link className="breadcrumb" href="/"><Icon name="back" size={16} />{t.library}</Link>
    <header className="book-hero">
      <div className="book-hero-cover"><BookCover id={novel.id} title={novel.title} author={novel.author} /></div>
      <div className="book-introduction">
        <div className="book-kicker"><span className="genre-label">{novel.genre}</span>{novel.publication === "draft" && <span className="state-badge draft">{t.draft}</span>}</div>
        <h1>{novel.title}</h1>
        <p className="book-author">{t.by} {novel.author}</p>
        <dl className="book-facts" aria-label={t.novel_details}>
          <div><dt>{t.status}</dt><dd><span className={`status-dot ${novel.status}`}>{t[novel.status]}</span></dd></div>
          <div><dt>{t.contents}</dt><dd>{novel.chapters.length} {t.chapters}</dd></div>
          <div><dt>{t.length}</dt><dd><WordCount count={total} /></dd></div>
          <div><dt>{t.date_added}</dt><dd>{novel.date}</dd></div>
        </dl>
        {novel.description && <Clamp className="book-description" text={novel.description} />}
        <div className="book-actions">
          {start && <Link className="button primary" href={`/novels/${novel.id}/chapter-${start.number}/`}>
            <Icon name="book" size={17} /><span className="button-label">{resume ? t.continue_reading : t.begin_reading}</span>{resume && <span className="resume-title">{resume.title}</span>}
          </Link>}
          {onEdit && <button className="button" disabled={busy} onClick={onEdit}><Icon name="edit" size={15} />{t.edit_details}</button>}
          {onDeleteNovel && <Menu label={t.more_actions}><button className="danger" disabled={busy} onClick={onDeleteNovel}><Icon name="trash" size={15} />{t.delete_novel}</button></Menu>}
        </div>
      </div>
    </header>

    {tabs.length > 1 ? <div className="book-tabs" role="tablist" aria-label={t.novel_details} onKeyDown={event => {
      const index = tabs.findIndex(item => item.id === tab);
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      const next = tabs[(index + step + tabs.length) % tabs.length].id;
      choose(next);
      document.getElementById(`tab-${next}`)?.focus();
    }}>
      {tabs.map(item => <button key={item.id} id={`tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} onClick={() => choose(item.id)}>
        {item.label}<small>{item.count}</small>
      </button>)}
    </div> : <div className="book-tabs"><h2 className="book-tabs-single">{t.table_of_contents}<small>{novel.chapters.length}</small></h2></div>}

    <section id="panel-contents" className="book-panel" role={tabs.length > 1 ? "tabpanel" : undefined} aria-labelledby={tabs.length > 1 ? "tab-contents" : undefined} hidden={tab !== "contents"}>
      <ChapterBrowser novel={novel} lastRead={lastRead} busy={busy} onAddChapter={onAddChapter} onOrganize={onOrganize} onDeleteChapter={onDeleteChapter} />
    </section>
    {tabs.some(item => item.id === "characters") && <section id="panel-characters" className="book-panel" role="tabpanel" aria-labelledby="tab-characters" hidden={tab !== "characters"}>
      <CharacterSection characters={characters} categories={novel.characterCategories ?? []} relations={relations} busy={busy}
        onEdit={onEditCharacter} onReorder={onReorderCharacters} onManageCategories={onManageCategories}
        onShowRelations={tabs.some(item => item.id === "relationships") ? showRelations : undefined} />
    </section>}
    {tabs.some(item => item.id === "relationships") && <section id="panel-relationships" className="book-panel" role="tabpanel" aria-labelledby="tab-relationships" hidden={tab !== "relationships"}>
      <RelationGraph characters={characters} categories={novel.characterCategories ?? []} relations={relations} focus={focus} onFocus={setFocus}
        onAdd={onAddRelation} onEdit={onEditRelation} busy={busy} />
    </section>}
  </main>;
}
