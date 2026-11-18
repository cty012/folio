"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookView, GenreState, WorkspaceNovel } from "@/lib/definitions";
import LibraryView from "../LibraryView";
import { useLabels } from "../Labels";
import Modal from "./Modal";
import NovelForm from "./NovelForm";
import { api } from "./api";

export default function LibraryManager({ novels, genres }: { novels: BookView[]; genres: GenreState }) {
  const router = useRouter(); const t = useLabels();
  const [dialog, setDialog] = useState<"novel" | "genre" | null>(null);
  const [editing, setEditing] = useState<WorkspaceNovel>();
  const [genreId, setGenreId] = useState<string>();
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const close = () => { setDialog(null); setError(""); };
  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <>
    {error && !dialog && <p className="page-width feedback error" role="alert">{error}</p>}
    <LibraryView busy={busy} novels={novels} genres={genres.genres}
      onAdd={() => { setEditing(undefined); setError(""); setDialog("novel"); }}
      onEdit={id => { if (!busy) run(async () => { const novel = await api<WorkspaceNovel>(`/api/cms/?id=${encodeURIComponent(id)}`); setEditing(novel); setDialog("novel"); }); }}
      onAddGenre={() => { setGenreId(undefined); setError(""); setDialog("genre"); }}
      onRenameGenre={id => { setGenreId(id); setError(""); setDialog("genre"); }} />
    {dialog === "novel" && <Modal title={editing ? t.edit_details : t.new_novel} onClose={close} busy={busy}>
      {error && <p className="feedback error" role="alert">{error}</p>}
      <NovelForm novel={editing} genres={genres} busy={busy} onCancel={close} onSubmit={fields => run(async () => {
        const novel = await api<WorkspaceNovel>({ action: editing ? "updateNovel" : "createNovel", id: editing?.id, revision: editing?.revision, ...fields });
        close(); if (!editing) router.push(`/novels/${novel.id}/`); router.refresh();
      })} />
    </Modal>}
    {dialog === "genre" && <Modal title={genreId ? t.rename_genre : t.new_genre} onClose={close} busy={busy}>
      {error && <p className="feedback error" role="alert">{error}</p>}
      <form className="edit-form" onSubmit={event => {
        event.preventDefault(); const name = new FormData(event.currentTarget).get("name");
        run(async () => { await api({ action: genreId ? "renameGenre" : "createGenre", genreId, name, revision: genres.revision }); close(); router.refresh(); });
      }}><fieldset disabled={busy}><label>{t.genre_name}<input name="name" required maxLength={200} data-autofocus defaultValue={genres.genres.find(genre => genre.id === genreId)?.name} /></label><footer className="form-actions"><button type="button" className="button" onClick={close}>{t.cancel}</button><button className="button primary">{t.save_genre}</button></footer></fieldset></form>
    </Modal>}
  </>;
}
