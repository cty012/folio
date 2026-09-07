"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { BookView } from "@/lib/definitions";
import { Icon } from "./Icons";
import { useLabels } from "./Labels";

type Props = {
  novels: BookView[];
  busy?: boolean;
  genres?: { id: string; name: string }[];
  onAdd?: () => void;
  onEdit?: (id: string) => void;
  onAddGenre?: () => void;
  onRenameGenre?: (id: string) => void;
};
export default function LibraryView({ novels, genres, onAdd, onEdit, onAddGenre, onRenameGenre, busy = false }: Props) {
  const t = useLabels();
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("date");
  const [group, setGroup] = useState("none");
  const entries = genres ?? [...new Set(novels.map(novel => novel.genre))].sort().map(name => ({ id: name, name }));
  const filtered = useMemo(() => novels.filter(novel => (!genre || (novel.genreKey ?? novel.genre) === genre) && `${novel.title} ${novel.author} ${novel.genre}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : b.date.localeCompare(a.date)), [novels, genre, query, sort]);
  const groups = group === "none" ? [["", filtered] as const] : Object.entries(Object.groupBy(filtered, novel => group === "genre" ? novel.genre : novel.author)).sort(([a], [b]) => a.localeCompare(b));
  return <main className="library-layout page-width">
    <aside className="library-sidebar" aria-label={t.genres}>
      <div className="side-caption">{t.library}</div>
      <button className={`shelf-filter ${!genre ? "selected" : ""}`} onClick={() => setGenre("")} aria-pressed={!genre}><Icon name="book" /><span>{t.all_stories}</span><small>{novels.length}</small></button>
      <div className="side-heading"><span>{t.genres}</span>{onAddGenre && <button className="icon-button" aria-label={t.new_genre} disabled={busy} onClick={onAddGenre}><Icon name="plus" size={16} /></button>}</div>
      <div className="genre-filters">{entries.map(entry => <div className="genre-item" key={entry.id}>
        <button className={`shelf-filter ${genre === entry.id ? "selected" : ""}`} aria-pressed={genre === entry.id} onClick={() => setGenre(entry.id)}><span className="genre-dot" /><span>{entry.name}</span><small>{novels.filter(n => (n.genreKey ?? n.genre) === entry.id).length}</small></button>
        {onRenameGenre && <button className="icon-button genre-edit" aria-label={`${t.rename_genre}: ${entry.name}`} disabled={busy} onClick={() => onRenameGenre(entry.id)}><Icon name="edit" size={14} /></button>}
      </div>)}</div>
    </aside>
    <section className="library-main">
      <header className="page-heading"><div><p className="eyebrow">{t.library}</p><h1>{entries.find(entry => entry.id === genre)?.name || t.all_stories}<span className="heading-count">{filtered.length}</span></h1></div>{onAdd && <button className="button primary" disabled={busy} onClick={onAdd}><Icon name="plus" />{t.new_novel}</button>}</header>
      <div className="library-toolbar">
        <label className="search-field"><Icon name="search" /><span className="sr-only">{t.search_library}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t.search_library} /></label>
        <label className="compact-select"><span>{t.group_by}</span><select value={group} onChange={event => setGroup(event.target.value)}><option value="none">{t.ungrouped}</option><option value="genre">{t.genre}</option><option value="author">{t.author}</option></select></label>
        <label className="compact-select"><span className="sr-only">{t.sort_by}</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="date">{t.recent_first}</option><option value="title">{t.alphabetical}</option></select></label>
      </div>
      {filtered.length === 0 ? <div className="empty-state"><Icon name="book" size={32} /><h2>{novels.length ? t.no_results : t.empty_library}</h2>{novels.length ? <button className="button" onClick={() => { setGenre(""); setQuery(""); }}>{t.clear_filters}</button> : onAdd && <><p>{t.empty_library_help}</p><button className="button primary" disabled={busy} onClick={onAdd}>{t.new_novel}</button></>}</div> : groups.map(([name, books]) => <section key={name} className="shelf-group">
        {name && <h2 className="group-title">{name}</h2>}
        <div className="novel-grid">{books?.map(novel => <article className="novel-card" key={novel.id}>
          <Link className={`novel-tile tone-${Array.from(novel.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4}`} href={`/novels/${novel.id}/`}>
            <div className="tile-top"><span>{novel.genre}</span><Icon name="arrow" /></div>
            <h2>{novel.title}</h2><p>{novel.author}</p>
          </Link>
          <div className="novel-card-body"><div className="card-meta"><span>{novel.chapters.length} {t.chapters}</span><span className={`status-dot ${novel.status}`}>{t[novel.status]}</span></div><p className="card-description">{novel.description}</p>
            <div className="card-footer"><span className="muted">{novel.publication === "draft" ? t.draft : novel.date}</span>{onEdit ? <button className="text-button" disabled={busy} onClick={() => onEdit(novel.id)}><Icon name="edit" size={14} />{t.edit_details}</button> : <Link className="text-button" href={`/novels/${novel.id}/`}>{t.open_novel}<Icon name="arrow" size={14} /></Link>}</div>
          </div>
        </article>)}</div>
      </section>)}
      <footer className="library-footer"><span>{novels.length} {t.stories}</span><span>Folio</span></footer>
    </section>
  </main>;
}
