// A typographic cover generated from the novel's own details. The ID picks
// the cloth colour and layout, so a book keeps its look when it is renamed.
const TONES = 8;
const STYLES = 3;
const WIDE = /[⺀-鿿가-힯豈-﫿＀-￯]/;

function hash(text: string) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.codePointAt(0)!, 16777619);
  return value >>> 0;
}

export default function BookCover({ id, title, author }: { id: string; title: string; author: string }) {
  const seed = hash(id);
  const characters = Array.from(title.trim());
  // CJK glyphs are about twice as wide as Latin letters at the same size.
  const width = characters.reduce((sum, char) => sum + (WIDE.test(char) ? 2 : 1), 0);
  const length = width <= 10 ? "short" : width <= 26 ? "medium" : "long";
  return <span className={`cover cover-tone-${seed % TONES} cover-style-${(seed >>> 8) % STYLES}`} data-length={length} aria-hidden="true">
    <span className="cover-face">
      <span className="cover-initial">{characters[0]}</span>
      <span className="cover-title">{title}</span>
      <span className="cover-rule" />
      <span className="cover-author">{author}</span>
    </span>
  </span>;
}
