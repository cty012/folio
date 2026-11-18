"use client";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CharacterRelation, NovelCharacter } from "@/lib/definitions";
import type { Dictionary } from "@/lib/dictionary";
import { categoryNames, initialOf, relationsOf, toneOf } from "@/lib/cast";
import { forceLayout, type Point } from "@/lib/graph-layout";
import { Icon } from "./Icons";
import { useLabels } from "./Labels";

const RADIUS = 22;
const format = (value: number) => value.toFixed(1);

/** The relationship as plain text, for labels and previews. */
export function relationText(t: Dictionary, relation: CharacterRelation, names: Map<string, string>) {
  return (relation.mutual ? t.relation_sentence_mutual : t.relation_sentence)
    .replace("{from}", names.get(relation.from) ?? "?").replace("{to}", names.get(relation.to) ?? "?").replace("{label}", relation.label);
}

/** The relationship as a sentence whose names can select that person. */
export function RelationSentence({ relation, names, onSelect }: { relation: CharacterRelation; names: Map<string, string>; onSelect?: (id: string) => void }) {
  const t = useLabels();
  const person = (id: string) => onSelect
    ? <button type="button" className="name-link" onClick={() => onSelect(id)}>{names.get(id)}</button>
    : <strong>{names.get(id)}</strong>;
  return <>{(relation.mutual ? t.relation_sentence_mutual : t.relation_sentence).split(/(\{from\}|\{to\}|\{label\})/).map((part, index) => <Fragment key={index}>
    {part === "{from}" ? person(relation.from) : part === "{to}" ? person(relation.to) : part === "{label}" ? <span className="relation-label">{relation.label}</span> : part}
  </Fragment>)}</>;
}

export default function RelationGraph({ characters, categories, relations, focus, onFocus, onAdd, onEdit, busy = false }: {
  characters: NovelCharacter[]; categories: string[]; relations: CharacterRelation[];
  focus: string | null; onFocus: (id: string | null) => void;
  onAdd?: (from?: string) => void; onEdit?: (index: number) => void; busy?: boolean;
}) {
  const t = useLabels();
  const marker = useId().replace(/[^\w-]/g, "");
  const frame = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; pointer: number; startX: number; startY: number; dx: number; dy: number; moved: boolean } | null>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [moved, setMoved] = useState<Record<string, Point>>({});
  const drawable = characters.length >= 2;
  // Phones get a portrait canvas so the drawing is not squeezed into a strip.
  const height = Math.round(width < 560 ? Math.max(380, width * 1.3) : Math.min(640, Math.max(380, width * 0.62)));
  const names = useMemo(() => new Map(characters.map(character => [character.id, character.name])), [characters]);
  const categoryList = categoryNames(characters, categories);
  const position = new Map(characters.map((character, index) => [character.id, index]));
  const edges = relations.map(relation => [position.get(relation.from)!, position.get(relation.to)!] as [number, number]);
  const groups = characters.map(character => { const index = character.category ? categoryList.indexOf(character.category) : -1; return index < 0 ? categoryList.length : index; });
  // Only who exists and who links to whom moves people around; relabelling keeps the drawing.
  const shape = JSON.stringify([characters.map(character => character.id), groups, edges]);
  const layout = useMemo(() => width ? forceLayout(characters.length, edges, groups, width, height, Math.min(64, Math.round(width * 0.12))) : [], [shape, width, height]);
  useEffect(() => setMoved({}), [shape, width]);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [drawable]);

  const at = (id: string): Point => moved[id] ?? layout[position.get(id)!] ?? { x: 0, y: 0 };
  const active = hovered ?? focus;
  const near = new Set(active ? [active, ...relations.flatMap(relation => relation.from === active ? [relation.to] : relation.to === active ? [relation.from] : [])] : []);
  const touches = (relation: CharacterRelation) => !!active && (relation.from === active || relation.to === active);
  const pairs = new Map<string, number[]>();
  relations.forEach((relation, index) => { const key = [relation.from, relation.to].sort().join("\n"); pairs.set(key, [...(pairs.get(key) ?? []), index]); });

  function geometry(relation: CharacterRelation, index: number) {
    const p = at(relation.from), q = at(relation.to);
    const siblings = pairs.get([relation.from, relation.to].sort().join("\n"))!;
    // Several links between the same two people bow apart instead of overlapping.
    const offset = (siblings.indexOf(index) - (siblings.length - 1) / 2) * 44;
    const [s, e] = relation.from < relation.to ? [p, q] : [q, p];
    const length = Math.hypot(e.x - s.x, e.y - s.y) || 1;
    const nx = -(e.y - s.y) / length, ny = (e.x - s.x) / length;
    const middle = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    const control = { x: middle.x + nx * offset * 2, y: middle.y + ny * offset * 2 };
    const toward = (from: Point, to: Point, distance: number) => {
      const span = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      return { x: from.x + ((to.x - from.x) / span) * distance, y: from.y + ((to.y - from.y) / span) * distance };
    };
    const start = toward(p, control, RADIUS + 2), end = toward(q, control, RADIUS + (relation.mutual ? 2 : 3));
    // Names sit under each node, so slide the label toward the lower person on steep links.
    const t = 0.5 + 0.16 * ((q.y - p.y) / (Math.hypot(q.x - p.x, q.y - p.y) || 1));
    const along = (a: number, b: number, c: number) => (1 - t) ** 2 * a + 2 * t * (1 - t) * b + t ** 2 * c;
    return {
      path: `M${format(start.x)} ${format(start.y)}Q${format(control.x)} ${format(control.y)} ${format(end.x)} ${format(end.y)}`,
      label: { x: along(p.x, control.x, q.x), y: along(p.y, control.y, q.y) },
    };
  }
  function pointFrom(event: React.PointerEvent): Point {
    const box = svg.current!.getBoundingClientRect();
    return { x: ((event.clientX - box.left) / box.width) * width, y: ((event.clientY - box.top) / box.height) * height };
  }
  const clamp = (value: number, max: number) => Math.min(Math.max(value, RADIUS + 4), max - RADIUS - 4);

  const focused = focus ? characters.find(character => character.id === focus) : undefined;
  const legend = categoryList.filter(name => characters.some(character => character.category === name));
  const list = (items: { relation: CharacterRelation; index: number }[]) => <ul className="relation-list">{items.map(({ relation, index }) => <li key={index}>
    <p><RelationSentence relation={relation} names={names} onSelect={onFocus} /></p>
    {onEdit && <button className="icon-button" disabled={busy} aria-label={`${t.edit_relationship}: ${relationText(t, relation, names)}`} title={t.edit_relationship} onClick={() => onEdit(index)}><Icon name="edit" size={14} /></button>}
  </li>)}</ul>;
  const ordered = relations.map((relation, index) => ({ relation, index })).sort((a, b) => Number(touches(a.relation)) - Number(touches(b.relation)));

  return <section className="relations" aria-labelledby="relations-heading">
    <header className="panel-heading">
      <h2 id="relations-heading">{t.relationship_map}<span className="panel-count">{relations.length}</span></h2>
      {onAdd && <div className="section-actions"><button className="button primary" disabled={busy || !drawable || relations.length >= 500} onClick={() => onAdd(focus ?? undefined)}><Icon name="plus" size={15} />{t.add_relationship}</button></div>}
    </header>
    {!drawable ? <p className="panel-empty">{t.relationships_need_characters}</p> : <div className="relations-layout">
      <div className="graph-panel">
        {legend.length > 0 && <ul className="graph-legend">
          {legend.map(name => <li key={name}><span className={`tone-dot tone-${toneOf(name, categoryList)}`} aria-hidden="true" />{name}</li>)}
          {characters.some(character => !character.category) && <li><span className="tone-dot tone--1" aria-hidden="true" />{t.uncategorized}</li>}
        </ul>}
        <div className="graph-frame" ref={frame} style={{ minHeight: width ? undefined : 380 }}>
          {width > 0 && <svg ref={svg} className="relation-graph" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="group" aria-label={t.relationship_map}>
            <defs>
              {["", "-lit"].map(suffix => <marker key={suffix} id={`${marker}${suffix}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path className={`graph-arrow${suffix ? " lit" : ""}`} d="M0 0L10 5L0 10Z" />
              </marker>)}
            </defs>
            <rect className="graph-backdrop" width={width} height={height} onClick={() => onFocus(null)} />
            {ordered.map(({ relation, index }) => {
              const lit = touches(relation);
              return <path key={index} className={`graph-edge${lit ? " lit" : active ? " dim" : ""}${relation.mutual ? " mutual" : ""}`} d={geometry(relation, index).path}
                markerEnd={relation.mutual ? undefined : `url(#${marker}${lit ? "-lit" : ""})`} />;
            })}
            {ordered.map(({ relation, index }) => {
              const { label } = geometry(relation, index), lit = touches(relation);
              return <text key={index} className={`graph-edge-label${lit ? " lit" : active ? " dim" : ""}`} x={format(label.x)} y={format(label.y)} dy="0.35em">{relation.label}</text>;
            })}
            {characters.map(character => {
              const point = at(character.id);
              const tone = toneOf(character.category, categoryList);
              const state = focus === character.id ? " selected" : active && !near.has(character.id) ? " dim" : "";
              return <g key={character.id} className={`graph-node tone-${tone}${state}`} transform={`translate(${format(point.x)} ${format(point.y)})`}
                tabIndex={0} role="button" aria-pressed={focus === character.id} aria-label={character.name}
                onPointerEnter={() => setHovered(character.id)} onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(character.id)} onBlur={() => setHovered(null)}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onFocus(focus === character.id ? null : character.id); }
                  if (event.key === "Escape") onFocus(null);
                }}
                onPointerDown={event => {
                  if (event.button !== 0) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  const pointer = pointFrom(event);
                  drag.current = { id: character.id, pointer: event.pointerId, startX: event.clientX, startY: event.clientY, dx: pointer.x - point.x, dy: pointer.y - point.y, moved: false };
                }}
                onPointerMove={event => {
                  const current = drag.current;
                  if (!current || current.pointer !== event.pointerId) return;
                  if (!current.moved && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 4) return;
                  current.moved = true;
                  const pointer = pointFrom(event);
                  setMoved(previous => ({ ...previous, [current.id]: { x: clamp(pointer.x - current.dx, width), y: clamp(pointer.y - current.dy, height) } }));
                }}
                onPointerUp={() => {
                  const current = drag.current;
                  drag.current = null;
                  if (current && !current.moved) onFocus(focus === current.id ? null : current.id);
                }}
                onPointerCancel={() => { drag.current = null; }}>
                <circle r={RADIUS} />
                <text className="graph-initial" dy="0.35em">{initialOf(character.name)}</text>
                <text className="graph-name" y={RADIUS + 17}>{character.name}</text>
              </g>;
            })}
          </svg>}
        </div>
        <p className="graph-hint">{t.graph_hint}</p>
      </div>
      <aside className="relations-side" aria-live="polite">
        {focused ? <>
          <header className="relations-person">
            <span className={`character-initial tone-${toneOf(focused.category, categoryList)}`} aria-hidden="true">{initialOf(focused.name)}</span>
            <div><h3>{focused.name}</h3>{(focused.category || focused.role) && <p>{[focused.category, focused.role].filter(Boolean).join(" · ")}</p>}</div>
            <button className="icon-button" aria-label={t.close} title={t.close} onClick={() => onFocus(null)}><Icon name="close" size={16} /></button>
          </header>
          {relationsOf(focused.id, relations).length ? list(relationsOf(focused.id, relations)) : <p className="panel-empty">{t.no_relationships_for}</p>}
          {onAdd && <button className="text-button relations-add" disabled={busy || relations.length >= 500} onClick={() => onAdd(focused.id)}><Icon name="plus" size={14} />{t.add_relationship}</button>}
        </> : <>
          <h3 className="relations-side-title">{t.all_relationships}<small>{relations.length}</small></h3>
          {relations.length ? list(relations.map((relation, index) => ({ relation, index }))) : <p className="panel-empty">{t.relationships_empty}</p>}
        </>}
      </aside>
    </div>}
  </section>;
}
