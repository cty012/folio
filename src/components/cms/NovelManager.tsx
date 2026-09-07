"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GenreState, WorkspaceNovel } from "@/lib/definitions";
import { bookView } from "@/lib/book-view";
import BookDetails from "../BookDetails";
import { useLabels } from "../Labels";
import Modal from "./Modal";
import NovelForm from "./NovelForm";
import { api } from "./api";
export default function NovelManager({ initialNovel, genres }: { initialNovel: WorkspaceNovel; genres: GenreState }) {
  const [novel, setNovel] = useState(initialNovel); const t = useLabels(); const router = useRouter();
  const [dialog, setDialog] = useState<"details" | "chapter" | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const close = () => { setDialog(null); setError(""); };
  async function mutate(action: string, fields: object = {}, next?: (novel: WorkspaceNovel) => void) {
    setBusy(true); setError("");
    try {
      const result = await api<WorkspaceNovel>({ action, id: novel.id, revision: novel.revision, ...fields });
      setNovel(result); close(); next?.(result); router.refresh();
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <>
    {error && !dialog && <p className="page-width feedback error" role="alert">{error}</p>}
    <BookDetails novel={bookView(novel)} busy={busy} onEdit={() => setDialog("details")} onAddChapter={() => setDialog("chapter")} onMove={(index, direction) => {
      const order = novel.chapters.map(chapter => chapter.number);
      [order[index], order[index + direction]] = [order[index + direction], order[index]];
      mutate("reorder", { order });
    }} />
    {dialog === "details" && <Modal title={t.edit_details} onClose={close} busy={busy}>
      {error && <p className="feedback error" role="alert">{error}</p>}
      <NovelForm novel={novel} genres={genres} busy={busy} onCancel={close} onSubmit={fields => mutate("updateNovel", fields)} />
    </Modal>}
    {dialog === "chapter" && <Modal title={t.new_chapter} onClose={close} busy={busy}>
      {error && <p className="feedback error" role="alert">{error}</p>}
      <form className="edit-form" onSubmit={event => {
        event.preventDefault(); const title = new FormData(event.currentTarget).get("title");
        mutate("createChapter", { title }, result => router.push(`/novels/${novel.id}/chapter-${result.chapters.at(-1)!.number}/?write=1`));
      }}><fieldset disabled={busy}><label>{t.chapter_title}<input name="title" required maxLength={200} autoFocus /></label><footer className="form-actions"><button type="button" className="button" onClick={close}>{t.cancel}</button><button className="button primary">{t.create_chapter}</button></footer></fieldset></form>
    </Modal>}
  </>;
}
