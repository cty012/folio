"use client";
import { useEffect, useRef, useState } from "react";
import type { WorkspaceNovel } from "@/lib/definitions";
import { bookView } from "@/lib/book-view";
import ReaderView from "../ReaderView";
import { Icon } from "../Icons";
import { useLabels } from "../Labels";
import { api } from "./api";

export default function ChapterEditor({ initialNovel, number, initialHtml, initialPublishedHtml, startEditing = false }: {
  initialNovel: WorkspaceNovel; number: number; initialHtml: string; initialPublishedHtml: string | null; startEditing?: boolean;
}) {
  const t = useLabels();
  const [novel, setNovel] = useState(initialNovel);
  const chapter = novel.chapters.find(chapter => chapter.number === number)!;
  const [title, setTitle] = useState(chapter.title);
  const [markdown, setMarkdown] = useState(chapter.markdown);
  const [savedHtml, setSavedHtml] = useState(initialHtml);
  const [publishedHtml, setPublishedHtml] = useState(initialPublishedHtml);
  const [editing, setEditing] = useState(startEditing);
  const [showPublished, setShowPublished] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [recovery, setRecovery] = useState<{ title: string; markdown: string } | null>(null);
  const key = `folio:draft:${novel.id}:${number}`;
  const dirty = title !== chapter.title || markdown !== chapter.markdown;
  const allowNavigation = useRef(false);

  useEffect(() => {
    try {
      const copy = JSON.parse(localStorage.getItem(key) || "null");
      if (typeof copy?.title === "string" && typeof copy?.markdown === "string" && (copy.title !== chapter.title || copy.markdown !== chapter.markdown)) setRecovery(copy);
    } catch { /* Browser storage is optional. */ }
  }, [key]);
  useEffect(() => {
    if (dirty) {
      try { localStorage.setItem(key, JSON.stringify({ title, markdown })); } catch { /* Disk saving remains available. */ }
    }
  }, [dirty, key, title, markdown]);
  useEffect(() => {
    allowNavigation.current = false;
    const unload = (event: BeforeUnloadEvent) => { if (dirty && !allowNavigation.current) event.preventDefault(); };
    const navigate = (event: MouseEvent) => {
      if (!dirty || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm(t.leave_unsaved)) { event.preventDefault(); event.stopPropagation(); }
      else allowNavigation.current = true;
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty, t.leave_unsaved]);

  function forgetRecovery() {
    try { localStorage.removeItem(key); } catch {}
    setRecovery(null);
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  async function mutate(action: string, fields: object = {}) {
    return api<WorkspaceNovel>({ action, id: novel.id, revision: novel.revision, number, ...fields });
  }
  async function save() {
    if (!dirty || busy || !title.trim()) return;
    await run(async () => {
      const rendered = await api<{ html: string }>({ action: "preview", markdown });
      const next = await mutate("saveChapter", { title, markdown });
      setNovel(next); setSavedHtml(rendered.html); forgetRecovery(); setMessage(t.saved);
    });
  }
  async function publish(remove = false) {
    await run(async () => {
      const next = await mutate(remove ? "unpublishChapter" : "publishChapter");
      setNovel(next); setPublishedHtml(remove ? null : savedHtml); setShowPublished(false);
      setMessage(remove ? t.unpublished_notice : t.published_notice);
    });
  }
  async function reload() {
    if (dirty && !window.confirm(t.confirm_discard)) return;
    await run(async () => {
      const next = await api<WorkspaceNovel>(`/api/cms/?id=${encodeURIComponent(novel.id)}`);
      const item = next.chapters.find(chapter => chapter.number === number);
      if (!item) throw new Error("This chapter was removed from the index. Return to the novel to load its latest contents.");
      const rendered = await api<{ html: string }>({ action: "preview", markdown: item.markdown });
      // Reload the whole document to also refresh the published snapshot.
      setNovel(next); setTitle(item.title); setMarkdown(item.markdown); setSavedHtml(rendered.html);
      forgetRecovery(); allowNavigation.current = true; window.location.reload();
    });
  }
  const toolbar = <>
    <span className={`state-badge ${showPublished ? "published" : ""}`}>{dirty ? t.unsaved : showPublished ? t.published_version : t.working_draft}</span>
    {chapter.published && !editing && <button className="text-button" disabled={busy} onClick={() => setShowPublished(!showPublished)}>{showPublished ? t.working_draft : t.published_version}</button>}
    {!editing ? <button className="button" disabled={busy} onClick={() => { setShowPublished(false); setEditing(true); }}><Icon name="edit" size={15} />{t.edit_chapter}</button> : <>
      <button className="button" disabled={busy} onClick={() => { if (dirty && !window.confirm(t.confirm_discard)) return; setTitle(chapter.title); setMarkdown(chapter.markdown); setEditing(false); setPreviewHtml(null); forgetRecovery(); }}>{t.close}</button>
      <button className="button primary" disabled={busy || !dirty || !title.trim()} onClick={save}><Icon name="check" size={15} />{busy ? t.saving : t.save_draft}</button>
    </>}
    <button className="button" disabled={busy || dirty} onClick={() => publish()}>{chapter.published ? t.publish_revision : t.publish_chapter}</button>
    {chapter.published && <button className="button subtle" disabled={busy || dirty} onClick={() => publish(true)}>{t.unpublish}</button>}
  </>;
  const notice = <>
    {error && <p className="feedback error" role="alert">{error}</p>}
    {message && <p className="feedback success" role="status">{message}</p>}
    {recovery && <div className="feedback recovery"><span>{t.recover_title}</span><button className="text-button" disabled={busy} onClick={() => { setTitle(recovery.title); setMarkdown(recovery.markdown); setEditing(true); setShowPublished(false); setRecovery(null); }}>{t.restore_text}</button><button className="text-button" disabled={busy} onClick={forgetRecovery}>{t.dismiss}</button></div>}
  </>;
  const editor = editing ? <section className="inline-editor">
    <label className="inline-title">{t.chapter_title}<input className="chapter-title-input" value={title} maxLength={200} disabled={busy} onChange={event => { setTitle(event.target.value); setMessage(""); }} /></label>
    <div className="editor-tabs"><div><button aria-pressed={previewHtml === null} onClick={() => setPreviewHtml(null)} disabled={busy}>{t.write}</button><button aria-pressed={previewHtml !== null} disabled={busy} onClick={() => run(async () => { setPreviewHtml((await api<{ html: string }>({ action: "preview", markdown })).html); })}>{t.preview_draft}</button></div><span className="muted">Markdown</span></div>
    {previewHtml !== null ? <article className="prose prose-slate dark:prose-invert reader-prose editor-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} /> : <label className="manuscript-field"><span className="sr-only">{t.markdown}</span><textarea value={markdown} disabled={busy} spellCheck placeholder={t.begin_writing} onChange={event => { setMarkdown(event.target.value); setMessage(""); }} onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "s") { event.preventDefault(); save(); } }} /></label>}
    <div className="editor-footnote"><span>{t.save_hint}</span><button className="text-button" disabled={busy} onClick={reload}>{t.reload_files}</button></div>
    <p className="form-hint">{t.draft_hint} <code>{chapter.contentFile}</code></p>
  </section> : undefined;
  return <ReaderView novel={bookView(novel)} number={number} title={showPublished ? chapter.published!.title : title} html={showPublished ? publishedHtml! : savedHtml} toolbar={toolbar} notice={notice} editor={editor} />;
}
