"use client";
import { useState } from "react";
import type { ChapterEntry, ContentsEntry, WorkspaceNovel } from "@/lib/definitions";
import { contentsOf, chapterOrder } from "@/lib/contents";
import { useLabels } from "../Labels";
import { Icon } from "../Icons";

export default function ContentsEditor({ novel, busy, onSave, onCancel }: {
  novel: WorkspaceNovel; busy: boolean; onSave: (contents: ContentsEntry[]) => void; onCancel: () => void;
}) {
  const t = useLabels();
  const [contents, setContents] = useState<ContentsEntry[]>(() => structuredClone(contentsOf(novel)));
  const [volumeTitle, setVolumeTitle] = useState("");
  const [first, setFirst] = useState("");
  const order = chapterOrder(contents);
  const volumes = contents.filter(entry => entry.type === "volume");
  const title = (number: number) => novel.chapters.find(chapter => chapter.number === number)!.title;
  function change(edit: (next: ContentsEntry[]) => void) {
    const next = structuredClone(contents); edit(next); setContents(next);
  }
  function moveChapter(number: number, destination: string) {
    const source = contents.findIndex(entry => entry.type === "chapter" ? entry.number === number : entry.chapters.some(chapter => chapter.number === number));
    const entry = contents[source];
    if (entry.type === "volume" && entry.chapters.length === 1 && !window.confirm(t.empty_volume_confirm)) return;
    change(next => {
      const from = next[source];
      const chapter: ChapterEntry = { type: "chapter", number };
      if (from.type === "chapter") next.splice(source, 1);
      else { from.chapters = from.chapters.filter(item => item.number !== number); if (!from.chapters.length) next.splice(source, 1); }
      if (!destination) next.splice(source + (from.type === "volume" && from.chapters.length ? 1 : 0), 0, chapter);
      else { const target = next.find(item => item.type === "volume" && item.id === destination); if (target?.type === "volume") target.chapters.push(chapter); }
    });
  }
  function arrows(index: number, length: number, name: string, volumeId?: string) {
    return <span className="outline-arrows">{[-1, 1].map(direction => <button type="button" className="icon-button" key={direction} disabled={busy || index + direction < 0 || index + direction >= length} aria-label={`${direction < 0 ? t.move_up : t.move_down}: ${name}`} onClick={() => change(next => {
      const volume = next.find(item => item.type === "volume" && item.id === volumeId);
      const list = volume?.type === "volume" ? volume.chapters : next;
      [list[index], list[index + direction]] = [list[index + direction], list[index]];
    })}><Icon name={direction < 0 ? "up" : "down"} size={16} /></button>)}</span>;
  }
  function chapterRow(chapter: ChapterEntry, index: number, length: number, volumeId = "") {
    return <div className="outline-chapter" key={`chapter-${chapter.number}`}>
      <span className="outline-chapter-title">{t.chapter.replace("{number}", String(order.indexOf(chapter.number) + 1))} · {title(chapter.number)}</span>
      {arrows(index, length, title(chapter.number), volumeId)}
      <label className="outline-destination"><span className="sr-only">{t.move_to}: {title(chapter.number)}</span><select value={volumeId} onChange={event => moveChapter(chapter.number, event.target.value)}><option value="">{t.standalone_chapter}</option>{volumes.map(volume => <option key={volume.id} value={volume.id}>{volume.title}</option>)}</select></label>
    </div>;
  }
  return <form className="edit-form contents-editor" onSubmit={event => { event.preventDefault(); onSave(contents); }}><fieldset disabled={busy}>
    <p className="form-hint">{t.organize_hint}</p>
    <div className="outline-list">{contents.map((entry, index) => entry.type === "chapter" ? chapterRow(entry, index, contents.length) : <section className="outline-volume" key={`volume-${entry.id}`}>
      <div className="outline-volume-heading"><label>{t.volume_title}<input value={entry.title} required maxLength={200} onChange={event => change(next => { const item = next[index]; if (item.type === "volume") item.title = event.target.value; })} /></label>{arrows(index, contents.length, entry.title)}<button type="button" className="text-button" onClick={() => change(next => next.splice(index, 1, ...entry.chapters))}>{t.ungroup_volume}</button></div>
      <label>{t.description}<textarea rows={2} maxLength={10000} value={entry.description} onChange={event => change(next => { const item = next[index]; if (item.type === "volume") item.description = event.target.value; })} /></label>
      {entry.chapters.map((chapter, i) => chapterRow(chapter, i, entry.chapters.length, entry.id))}
    </section>)}</div>
    <section className="outline-create"><h3>{t.new_volume}</h3><label>{t.volume_title}<input value={volumeTitle} maxLength={200} onChange={event => setVolumeTitle(event.target.value)} /></label><label>{t.first_chapter}<select value={first} onChange={event => setFirst(event.target.value)}><option value="">{t.select_chapter}</option>{contents.filter(entry => entry.type === "chapter").map(chapter => <option key={`chapter-${chapter.number}`} value={chapter.number}>{title(chapter.number)}</option>)}</select></label>
      <button type="button" className="button" disabled={!volumeTitle.trim() || !first || !contents.some(entry => entry.type === "chapter" && entry.number === Number(first))} onClick={() => {
        change(next => { const index = next.findIndex(entry => entry.type === "chapter" && entry.number === Number(first)); next.splice(index, 1, { type: "volume", id: crypto.randomUUID(), title: volumeTitle.trim(), description: "", chapters: [{ type: "chapter", number: Number(first) }] }); }); setFirst(""); setVolumeTitle("");
      }}>{t.group_chapter}</button><p className="form-hint">{t.group_hint}</p>
    </section>
    <footer className="form-actions"><button type="button" className="button" onClick={onCancel}>{t.cancel}</button><button className="button primary">{busy ? t.saving : t.save_changes}</button></footer>
  </fieldset></form>;
}
