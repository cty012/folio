import { test } from 'node:test';
import assert from 'node:assert/strict';
import { characterGroups, moveInCategory, relationsOf } from '../src/lib/cast.ts';
import { contentsSections } from '../src/lib/contents.ts';
import { forceLayout } from '../src/lib/graph-layout.ts';
import type { NovelCharacter } from '../src/lib/definitions.ts';

const person = (id: string, category?: string): NovelCharacter => ({ id, name: id, role: '', introduction: '', ...(category ? { category } : {}) });

test('characters group by saved category order, then by first use, with uncategorized last', () => {
  const cast = [person('a', 'Crew'), person('b'), person('c', 'Guild'), person('d', 'Crew'), person('e', 'Rivals')];
  const groups = characterGroups(cast, ['Rivals', 'Empty', 'Crew']);
  assert.deepEqual(groups.map(group => group.name), ['Rivals', 'Crew', 'Guild', null]);
  assert.deepEqual(groups.map(group => group.members.map(member => member.character.id)), [['e'], ['a', 'd'], ['c'], ['b']]);
  // Colours follow the full category list, so an empty category keeps its slot.
  assert.deepEqual(groups.map(group => group.tone), [0, 2, 3, -1]);
});

test('moving a character skips over people in other categories', () => {
  const cast = [person('a', 'Crew'), person('b'), person('c', 'Crew')];
  assert.deepEqual(moveInCategory(cast, 2, -1)?.map(character => character.id), ['c', 'b', 'a']);
  assert.equal(moveInCategory(cast, 0, -1), null);
  assert.equal(moveInCategory(cast, 1, 1), null);
  assert.deepEqual(relationsOf('b', [{ from: 'a', to: 'b', label: 'x' }, { from: 'a', to: 'c', label: 'y' }]).map(item => item.index), [0]);
});

test('contents split into volumes and evenly sized runs of standalone chapters', () => {
  const chapters = Array.from({ length: 120 }, (_, index) => ({ number: index + 1, title: `${index + 1}` }));
  assert.deepEqual(contentsSections({ chapters }).map(section => section.numbers.length), [40, 40, 40]);
  assert.deepEqual(contentsSections({ chapters: chapters.slice(0, 50) }).map(section => section.numbers.length), [50]);
  const contents = [
    { type: 'chapter' as const, number: 1 },
    { type: 'volume' as const, id: 'one', title: 'One', description: '', chapters: [2, 3].map(number => ({ type: 'chapter' as const, number })) },
    { type: 'chapter' as const, number: 4 }, { type: 'chapter' as const, number: 5 },
  ];
  const sections = contentsSections({ chapters: chapters.slice(0, 5), contents });
  assert.deepEqual(sections.map(section => [section.key, section.numbers]), [['chapters-1', [1]], ['volume-one', [2, 3]], ['chapters-4', [4, 5]]]);
});

test('relationship layout is deterministic, stays in the box and keeps people apart', () => {
  const edges: [number, number][] = [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [0, 5]];
  for (const [width, height] of [[620, 384], [333, 433], [900, 560]]) {
    const first = forceLayout(8, edges, [0, 0, 1, 1, 2, 2, 3, 3], width, height, 48, 40);
    assert.deepEqual(forceLayout(8, edges, [0, 0, 1, 1, 2, 2, 3, 3], width, height, 48, 40), first);
    for (const point of first) {
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
      assert.ok(point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height, `${point.x},${point.y} outside ${width}×${height}`);
    }
    const connected = first.slice(0, 6);
    for (let a = 0; a < connected.length; a++) for (let b = a + 1; b < connected.length; b++)
      assert.ok(Math.hypot(connected[a].x - connected[b].x, connected[a].y - connected[b].y) > 80);
    // People without relationships wait in a lane beside (or below) the drawing.
    const loners = first.slice(6);
    if (width >= height) assert.ok(loners.every(point => point.x < Math.min(...connected.map(other => other.x))));
    else assert.ok(loners.every(point => point.y > Math.max(...connected.map(other => other.y))));
  }
  assert.deepEqual(forceLayout(0, [], [], 400, 300), []);
  assert.deepEqual(forceLayout(1, [], [0], 400, 300), [{ x: 200, y: 150 }]);
});
