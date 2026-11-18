"use client";
import { useId, useState } from "react";
import type { CharacterRelation, NovelCharacter } from "@/lib/definitions";
import { categoryNames } from "@/lib/cast";
import { Icon } from "../Icons";
import { useLabels } from "../Labels";
import { relationText } from "../RelationGraph";
import Modal from "./Modal";

/** IDs only need to be unique within one novel; randomUUID is unavailable outside secure contexts. */
export function newId() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function Feedback({ error }: { error: string }) {
  return error ? <p className="feedback error" role="alert">{error}</p> : null;
}

export function CharacterDialog({ character, characters, categories, busy, error, onClose, onSave, onRemove }: {
  character?: NovelCharacter; characters: NovelCharacter[]; categories: string[]; busy: boolean; error: string;
  onClose: () => void; onSave: (character: NovelCharacter) => void; onRemove: () => void;
}) {
  const t = useLabels();
  const list = useId();
  return <Modal title={character ? t.edit_character : t.add_character} onClose={onClose} busy={busy}>
    <Feedback error={error} />
    <form className="edit-form" onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const category = String(fields.get("category")).trim();
      onSave({
        id: character?.id ?? newId(), name: String(fields.get("name")), role: String(fields.get("role")),
        introduction: String(fields.get("introduction")), ...(category ? { category } : {}),
      });
    }}><fieldset disabled={busy}>
      <label>{t.character_name}<input name="name" defaultValue={character?.name} required maxLength={200} data-autofocus /></label>
      <div className="form-columns">
        <label>{t.character_category}<input name="category" defaultValue={character?.category} maxLength={100} list={list} placeholder={t.character_category_placeholder} autoComplete="off" /></label>
        <label>{t.character_role}<input name="role" defaultValue={character?.role} maxLength={200} placeholder={t.character_role_placeholder} /></label>
      </div>
      <datalist id={list}>{categoryNames(characters, categories).map(name => <option key={name} value={name} />)}</datalist>
      <p className="form-hint">{t.category_hint}</p>
      <label>{t.character_introduction}<textarea name="introduction" defaultValue={character?.introduction} rows={6} maxLength={10000} /></label>
      <p className="form-hint">{t.characters_hint}</p>
      <footer className="form-actions split-actions">
        {character && <button type="button" className="text-button danger-link" onClick={() => { if (window.confirm(t.remove_character_confirm)) onRemove(); }}>{t.remove_character}</button>}
        <button type="button" className="button" onClick={onClose}>{t.cancel}</button><button className="button primary">{busy ? t.saving : t.save_changes}</button>
      </footer>
    </fieldset></form>
  </Modal>;
}

/** Rename, reorder, add and remove categories. Characters follow renames and lose removed ones. */
export function CategoriesDialog({ characters, categories, busy, error, onClose, onSave }: {
  characters: NovelCharacter[]; categories: string[]; busy: boolean; error: string;
  onClose: () => void; onSave: (categories: string[], characters: NovelCharacter[]) => void;
}) {
  const t = useLabels();
  const [rows, setRows] = useState(() => categoryNames(characters, categories).map(name => ({ key: newId(), original: name as string | null, name })));
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState("");
  const count = (name: string | null) => name === null ? 0 : characters.filter(character => character.category === name).length;
  const taken = (name: string, key?: string) => rows.some(row => row.key !== key && row.name.trim() === name.trim());
  function add() {
    const name = draft.trim();
    if (!name) return;
    if (taken(name)) { setProblem(t.category_exists); return; }
    setRows([...rows, { key: newId(), original: null, name }]); setDraft(""); setProblem("");
  }
  return <Modal title={t.manage_categories} onClose={onClose} busy={busy}>
    <Feedback error={error || problem} />
    <form className="edit-form" onSubmit={event => {
      event.preventDefault();
      const names = rows.map(row => row.name.trim());
      if (names.some((name, index) => names.indexOf(name) !== index)) { setProblem(t.category_exists); return; }
      const renamed = new Map(rows.filter(row => row.original !== null).map(row => [row.original!, row.name.trim()]));
      onSave(names, characters.map(character => {
        if (!character.category) return character;
        const next = renamed.get(character.category);
        if (next) return { ...character, category: next };
        const { category: _removed, ...rest } = character;
        return rest;
      }));
    }}><fieldset disabled={busy}>
      <p className="form-hint">{t.categories_hint}</p>
      {rows.length ? <ol className="category-list">{rows.map((row, index) => <li key={row.key}>
        <label><span className="sr-only">{t.category_name}</span><input value={row.name} required maxLength={100} onChange={event => setRows(rows.map(item => item.key === row.key ? { ...item, name: event.target.value } : item))} /></label>
        <small>{t.character_count.replace("{count}", String(count(row.original)))}</small>
        <span className="outline-arrows">{[-1, 1].map(direction => <button type="button" className="icon-button" key={direction} disabled={index + direction < 0 || index + direction >= rows.length}
          aria-label={`${direction < 0 ? t.move_up : t.move_down}: ${row.name}`} title={direction < 0 ? t.move_up : t.move_down} onClick={() => {
            const next = [...rows]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; setRows(next);
          }}><Icon name={direction < 0 ? "up" : "down"} size={16} /></button>)}</span>
        <button type="button" className="icon-button danger" aria-label={`${t.remove_category}: ${row.name}`} title={t.remove_category} onClick={() => setRows(rows.filter(item => item.key !== row.key))}><Icon name="trash" size={15} /></button>
      </li>)}</ol> : <p className="panel-empty">{t.categories_empty}</p>}
      <div className="inline-add">
        <label><span className="sr-only">{t.category_name}</span><input value={draft} maxLength={100} placeholder={t.category_name} onChange={event => { setDraft(event.target.value); setProblem(""); }}
          onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); add(); } }} /></label>
        <button type="button" className="button" disabled={!draft.trim() || rows.length >= 50} onClick={add}><Icon name="plus" size={15} />{t.add_category}</button>
      </div>
      <footer className="form-actions"><button type="button" className="button" onClick={onClose}>{t.cancel}</button><button className="button primary">{busy ? t.saving : t.save_changes}</button></footer>
    </fieldset></form>
  </Modal>;
}

export function RelationDialog({ relation, from, characters, relations, busy, error, onClose, onSave, onRemove }: {
  relation?: CharacterRelation; from?: string; characters: NovelCharacter[]; relations: CharacterRelation[]; busy: boolean; error: string;
  onClose: () => void; onSave: (relation: CharacterRelation) => void; onRemove: () => void;
}) {
  const t = useLabels();
  const list = useId();
  const [value, setValue] = useState<CharacterRelation>(() => relation ?? {
    from: from ?? characters[0]?.id ?? "", to: characters.find(character => character.id !== (from ?? characters[0]?.id))?.id ?? "", label: "",
  });
  const names = new Map(characters.map(character => [character.id, character.name]));
  const same = value.from === value.to;
  const labels = [...new Set(relations.map(item => item.label))];
  const options = characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>);
  return <Modal title={relation ? t.edit_relationship : t.add_relationship} onClose={onClose} busy={busy}>
    <Feedback error={error} />
    <form className="edit-form" onSubmit={event => {
      event.preventDefault();
      if (same) return;
      onSave(value.mutual ? { ...value, label: value.label.trim(), mutual: true } : { from: value.from, to: value.to, label: value.label.trim() });
    }}><fieldset disabled={busy}>
      <div className="form-columns">
        <label>{t.relation_from}<select value={value.from} onChange={event => setValue({ ...value, from: event.target.value })}>{options}</select></label>
        <label>{t.relation_to}<select value={value.to} onChange={event => setValue({ ...value, to: event.target.value })}>{options}</select></label>
      </div>
      <label>{t.relation_label}<input value={value.label} required maxLength={60} list={list} placeholder={t.relation_label_placeholder} data-autofocus autoComplete="off" onChange={event => setValue({ ...value, label: event.target.value })} /></label>
      <datalist id={list}>{labels.map(label => <option key={label} value={label} />)}</datalist>
      <label className="check-field"><input type="checkbox" checked={!!value.mutual} onChange={event => setValue({ ...value, mutual: event.target.checked })} /><span>{t.relation_mutual}</span></label>
      {same ? <p className="form-hint field-problem" role="alert">{t.relation_same_character}</p>
        : value.label.trim() && <p className="relation-preview"><span>{t.relation_preview}</span>{relationText(t, { ...value, label: value.label.trim() }, names)}</p>}
      <footer className="form-actions split-actions">
        {relation && <button type="button" className="text-button danger-link" onClick={onRemove}>{t.remove_relationship}</button>}
        <button type="button" className="button" onClick={onClose}>{t.cancel}</button><button className="button primary" disabled={same}>{busy ? t.saving : t.save_changes}</button>
      </footer>
    </fieldset></form>
  </Modal>;
}
