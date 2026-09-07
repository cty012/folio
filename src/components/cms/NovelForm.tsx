"use client";
import type { GenreState, WorkspaceNovel } from "@/lib/definitions";
import { useLabels } from "../Labels";
export default function NovelForm({ novel, genres, busy, onSubmit, onCancel }: {
  novel?: WorkspaceNovel; genres: GenreState; busy: boolean;
  onSubmit: (fields: Record<string, FormDataEntryValue>) => void; onCancel: () => void;
}) {
  const t = useLabels();
  return <form className="edit-form" onSubmit={event => { event.preventDefault(); onSubmit(Object.fromEntries(new FormData(event.currentTarget))); }}>
    <fieldset disabled={busy}>
      <label>{t.title}<input name="title" defaultValue={novel?.title} required maxLength={200} autoFocus /></label>
      <div className="form-columns"><label>{t.author}<input name="author" defaultValue={novel?.author} required maxLength={200} /></label>
      <label>{t.genre}<select name="genreKey" defaultValue={novel?.genreKey ?? novel?.genre ?? genres.genres[0]?.id ?? "Uncategorized"}>
        {genres.genres.length ? genres.genres.map(genre => <option value={genre.id} key={genre.id}>{genre.name}</option>) : <option>Uncategorized</option>}
      </select></label></div>
      <label>{t.description}<textarea name="description" defaultValue={novel?.description} rows={4} maxLength={10000} /></label>
      {novel && <label>{t.status}<select name="status" defaultValue={novel.status}><option value="ongoing">{t.ongoing}</option><option value="completed">{t.completed}</option><option value="on-hiatus">{t["on-hiatus"]}</option></select></label>}
      {novel?.publication === "published" && <p className="form-hint">{t.metadata_hint}</p>}
      <footer className="form-actions"><button type="button" className="button" onClick={onCancel}>{t.cancel}</button><button className="button primary">{busy ? t.saving : novel ? t.save_changes : t.create_novel}</button></footer>
    </fieldset>
  </form>;
}
