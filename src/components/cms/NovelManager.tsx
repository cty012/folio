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
import DeleteDialog from "./DeleteDialog";
import ContentsEditor from "./ContentsEditor";
import { lastInVolume } from "@/lib/contents";
import { CategoriesDialog, CharacterDialog, RelationDialog } from "./CastDialogs";
export default function NovelManager({ initialNovel, genres }: { initialNovel: WorkspaceNovel; genres: GenreState }) {
  const [novel, setNovel] = useState(initialNovel); const t = useLabels(); const router = useRouter();
  const [dialog, setDialog] = useState<"details" | "chapter" | "character" | "categories" | "relation" | "deleteNovel" | "deleteChapter" | "contents" | null>(null);
  const [chapterDestination, setChapterDestination] = useState("");
  const [deleteNumber, setDeleteNumber] = useState<number | null>(null);
  const [characterIndex, setCharacterIndex] = useState<number | null>(null);
  const [relationIndex, setRelationIndex] = useState<number | null>(null);
  const [relationFrom, setRelationFrom] = useState<string | undefined>();
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const close = () => { setDialog(null); setError(""); };
  const characters = novel.characters ?? [];
  const relations = novel.characterRelations ?? [];
  const character = characterIndex === null ? undefined : characters[characterIndex];
  async function mutate(action: string, fields: object = {}, next?: (novel: WorkspaceNovel) => void) {
    setBusy(true); setError("");
    try {
      const result = await api<WorkspaceNovel>({ action, id: novel.id, revision: novel.revision, ...fields });
      setNovel(result); close(); next?.(result); router.refresh();
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <>
    {error && !dialog && <p className="page-width feedback error" role="alert">{error}</p>}
    <BookDetails novel={bookView(novel)} busy={busy}
      onEdit={() => setDialog("details")} onOrganize={() => setDialog("contents")} onDeleteNovel={() => setDialog("deleteNovel")}
      onAddChapter={() => { setChapterDestination(""); setDialog("chapter"); }}
      onDeleteChapter={number => { setDeleteNumber(number); setDialog("deleteChapter"); }}
      onEditCharacter={index => { setCharacterIndex(index); setDialog("character"); }}
      onReorderCharacters={order => mutate("updateCharacters", { characters: order })}
      onManageCategories={() => setDialog("categories")}
      onAddRelation={from => { setRelationIndex(null); setRelationFrom(from); setDialog("relation"); }}
      onEditRelation={index => { setRelationIndex(index); setDialog("relation"); }} />
    {(dialog === "deleteNovel" || dialog === "deleteChapter") && <DeleteDialog removesVolume={dialog === "deleteChapter" && deleteNumber !== null && lastInVolume(novel, deleteNumber)} kind={dialog === "deleteNovel" ? "novel" : "chapter"} title={dialog === "deleteNovel" ? novel.title : novel.chapters.find(chapter => chapter.number === deleteNumber)?.title ?? ""} busy={busy} error={error} onClose={close} onConfirm={async () => {
      if (dialog === "deleteChapter") { await mutate("deleteChapter", { number: deleteNumber }); return; }
      setBusy(true); setError("");
      try {
        await api({ action: "deleteNovel", id: novel.id, revision: novel.revision });
        router.replace("/"); router.refresh();
      } catch (error) { setError((error as Error).message); setBusy(false); }
    }} />}
    {dialog === "contents" && <Modal title={t.organize_contents} onClose={close} busy={busy}>
      {error && <p className="feedback error" role="alert">{error}</p>}
      <ContentsEditor novel={novel} busy={busy} onCancel={close} onSave={contents => mutate("updateContents", { contents })} />
    </Modal>}
    {dialog === "details" && <Modal title={t.edit_details} onClose={close} busy={busy}>
      {error && <p className="feedback error" role="alert">{error}</p>}
      <NovelForm novel={novel} genres={genres} busy={busy} onCancel={close} onSubmit={fields => mutate("updateNovel", fields)} />
    </Modal>}
    {dialog === "character" && <CharacterDialog character={character} characters={characters} categories={novel.characterCategories ?? []} busy={busy} error={error} onClose={close}
      onSave={profile => {
        const updated = [...characters];
        if (characterIndex === null) updated.push(profile); else updated[characterIndex] = profile;
        mutate("updateCharacters", { characters: updated });
      }}
      onRemove={() => mutate("updateCharacters", { characters: characters.filter((_, index) => index !== characterIndex) })} />}
    {dialog === "categories" && <CategoriesDialog characters={characters} categories={novel.characterCategories ?? []} busy={busy} error={error} onClose={close}
      onSave={(categories, updated) => mutate("updateCharacters", { characters: updated, categories })} />}
    {dialog === "relation" && <RelationDialog relation={relationIndex === null ? undefined : relations[relationIndex]} from={relationFrom} characters={characters} relations={relations} busy={busy} error={error} onClose={close}
      onSave={relation => {
        const updated = [...relations];
        if (relationIndex === null) updated.push(relation); else updated[relationIndex] = relation;
        mutate("updateCharacters", { characters, relations: updated });
      }}
      onRemove={() => mutate("updateCharacters", { characters, relations: relations.filter((_, index) => index !== relationIndex) })} />}
    {dialog === "chapter" && <Modal title={t.new_chapter} onClose={close} busy={busy}>
      {error && <p className="feedback error" role="alert">{error}</p>}
      <form className="edit-form" onSubmit={event => {
        event.preventDefault(); const fields = new FormData(event.currentTarget);
        mutate("createChapter", { title: fields.get("title"), volumeId: chapterDestination === ":new" ? undefined : chapterDestination, newVolumeTitle: fields.get("newVolumeTitle") }, result => {
          const added = result.chapters.find(chapter => !novel.chapters.some(old => old.number === chapter.number))!;
          router.push(`/novels/${novel.id}/chapter-${added.number}/?write=1`);
        });
      }}><fieldset disabled={busy}><label>{t.chapter_title}<input name="title" required maxLength={200} data-autofocus /></label><label>{t.chapter_container}<select value={chapterDestination} onChange={event => setChapterDestination(event.target.value)}><option value="">{t.standalone_chapter}</option>{novel.contents?.filter(entry => entry.type === "volume").map(volume => <option value={volume.id} key={volume.id}>{volume.title}</option>)}<option value=":new">{t.new_volume}</option></select></label>{chapterDestination === ":new" && <label>{t.volume_title}<input name="newVolumeTitle" required maxLength={200} /></label>}<footer className="form-actions"><button type="button" className="button" onClick={close}>{t.cancel}</button><button className="button primary">{t.create_chapter}</button></footer></fieldset></form>
    </Modal>}
  </>;
}
