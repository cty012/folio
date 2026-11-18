"use client";
import { useState } from "react";
import type { CharacterRelation, NovelCharacter } from "@/lib/definitions";
import { characterGroups, initialOf, moveInCategory, relationsOf } from "@/lib/cast";
import Clamp from "./Clamp";
import { Icon } from "./Icons";
import { useLabels } from "./Labels";

export default function CharacterSection({ characters, categories, relations, onEdit, onReorder, onManageCategories, onShowRelations, busy = false }: {
  characters: NovelCharacter[];
  categories: string[];
  relations: CharacterRelation[];
  onEdit?: (index: number | null) => void;
  onReorder?: (characters: NovelCharacter[]) => void;
  onManageCategories?: () => void;
  onShowRelations?: (id: string) => void;
  busy?: boolean;
}) {
  const t = useLabels();
  const groups = characterGroups(characters, categories);
  const [filter, setFilter] = useState<string | null>(null);
  const key = (name: string | null) => name ?? "\0other";
  // A filter whose category was emptied or removed falls back to everyone.
  const active = groups.some(group => key(group.name) === filter) ? filter : null;
  const visible = groups.filter(group => active === null || key(group.name) === active);
  const headed = groups.length > 1 || groups.some(group => group.name);
  return <section className="cast" aria-labelledby="characters-heading">
    <header className="panel-heading">
      <h2 id="characters-heading">{t.main_characters}<span className="panel-count">{t.character_count.replace("{count}", String(characters.length))}</span></h2>
      {onEdit && <div className="section-actions">
        {onManageCategories && <button className="button" disabled={busy} onClick={onManageCategories}>{t.manage_categories}</button>}
        <button className="button primary" disabled={busy || characters.length >= 100} onClick={() => onEdit(null)}><Icon name="plus" size={15} />{t.add_character}</button>
      </div>}
    </header>
    {groups.length > 1 && <div className="filter-chips" role="group" aria-label={t.characters_tab}>
      <button aria-pressed={active === null} onClick={() => setFilter(null)}>{t.all_characters}<small>{characters.length}</small></button>
      {groups.map(group => <button key={key(group.name)} aria-pressed={active === key(group.name)} onClick={() => setFilter(key(group.name))}>
        <span className={`tone-dot tone-${group.tone}`} aria-hidden="true" />{group.name ?? t.uncategorized}<small>{group.members.length}</small>
      </button>)}
    </div>}
    {!characters.length ? <p className="panel-empty">{t.characters_empty}</p> : visible.map(group => <section className="cast-group" key={key(group.name)} aria-label={group.name ?? t.uncategorized}>
      {headed && <h3 className="cast-group-heading"><span className={`tone-dot tone-${group.tone}`} aria-hidden="true" />{group.name ?? t.uncategorized}<small>{group.members.length}</small></h3>}
      <ul className="character-grid">{group.members.map(({ character, index }) => {
        const linked = relationsOf(character.id, relations).length;
        const up = onReorder && moveInCategory(characters, index, -1), down = onReorder && moveInCategory(characters, index, 1);
        return <li className="character-card" key={character.id}>
          <div className="character-heading">
            <span className={`character-initial tone-${group.tone}`} aria-hidden="true">{initialOf(character.name)}</span>
            <div><h3>{character.name}</h3>{character.role && <p className="character-role">{character.role}</p>}</div>
          </div>
          {character.introduction && <Clamp className="character-introduction" text={character.introduction} />}
          {(onEdit || (linked > 0 && onShowRelations)) && <footer className="character-actions">
            {linked > 0 && onShowRelations ? <button className="text-button" onClick={() => onShowRelations(character.id)}><Icon name="link" size={14} />{t.relationships} {linked}</button> : <span />}
            {onEdit && <div>
              {onReorder && (up || down) && <>
                <button className="icon-button" disabled={busy || !up} aria-label={`${t.move_up}: ${character.name}`} title={t.move_up} onClick={() => up && onReorder(up)}><Icon name="up" size={16} /></button>
                <button className="icon-button" disabled={busy || !down} aria-label={`${t.move_down}: ${character.name}`} title={t.move_down} onClick={() => down && onReorder(down)}><Icon name="down" size={16} /></button>
              </>}
              <button className="icon-button" disabled={busy} aria-label={`${t.edit_character}: ${character.name}`} title={t.edit_character} onClick={() => onEdit(index)}><Icon name="edit" size={15} /></button>
            </div>}
          </footer>}
        </li>;
      })}</ul>
    </section>)}
  </section>;
}
