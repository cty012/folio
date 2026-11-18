import type { CharacterRelation, NovelCharacter } from "./definitions.ts";

/** Number of category colours defined in globals.css (`.tone-0` … `.tone-7`). */
export const TONES = 8;

export type CharacterGroup = {
  /** Category name, or null for characters without one. */
  name: string | null;
  /** Colour index; -1 for uncategorized characters. */
  tone: number;
  members: { character: NovelCharacter; index: number }[];
};

/** Every category in display order: the saved list, then any used only by a profile. */
export function categoryNames(characters: NovelCharacter[], categories: string[] = []): string[] {
  const names = [...categories];
  for (const character of characters) if (character.category && !names.includes(character.category)) names.push(character.category);
  return names;
}

export function toneOf(category: string | undefined, names: string[]): number {
  const index = category ? names.indexOf(category) : -1;
  return index < 0 ? -1 : index % TONES;
}

/** Non-empty groups in category order, with uncategorized characters last. */
export function characterGroups(characters: NovelCharacter[], categories: string[] = []): CharacterGroup[] {
  const names = categoryNames(characters, categories);
  const groups: CharacterGroup[] = names.map((name, index) => ({ name, tone: index % TONES, members: [] }));
  const other: CharacterGroup = { name: null, tone: -1, members: [] };
  characters.forEach((character, index) => (groups.find(group => group.name === character.category) ?? other).members.push({ character, index }));
  return [...groups, other].filter(group => group.members.length);
}

/** Swaps a character with its nearest neighbour in the same category. Returns null at either end. */
export function moveInCategory(characters: NovelCharacter[], index: number, direction: number): NovelCharacter[] | null {
  const category = characters[index]?.category ?? "";
  for (let other = index + direction; other >= 0 && other < characters.length; other += direction) {
    if ((characters[other].category ?? "") !== category) continue;
    const order = [...characters];
    [order[index], order[other]] = [order[other], order[index]];
    return order;
  }
  return null;
}

export function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toLocaleUpperCase() ?? "?";
}

export function relationsOf(id: string, relations: CharacterRelation[]): { relation: CharacterRelation; index: number }[] {
  return relations.flatMap((relation, index) => relation.from === id || relation.to === id ? [{ relation, index }] : []);
}
