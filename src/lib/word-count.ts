import { remark } from "remark";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";

const parser = remark().use(remarkGfm).use(remarkMath);
type Node = { type: string; value?: string; lang?: string; children?: Node[] };

function readableText(node: Node): string {
  if (node.type === "math" || node.type === "inlineMath" || (node.type === "code" && node.lang === "math")) return " ";
  if (["image", "imageReference", "definition", "html"].includes(node.type)) return "";
  if (node.type === "text" || node.type === "inlineCode") return node.value ?? "";
  if (node.type === "code") return `\n${node.value ?? ""}\n`;
  if (node.type === "break") return "\n";
  const content = (node.children ?? []).map(readableText).join("");
  return ["paragraph", "heading", "listItem", "blockquote", "tableCell", "tableRow"].includes(node.type) ? `\n${content}\n` : content;
}

/** Count chapter text, not Markdown syntax, image labels, or link destinations.
 * Each Han character counts as one; other letter/number runs count as words.
 */
export function countWords(markdown: string): number {
  const text = readableText(parser.parse(markdown) as Node);
  const han = text.match(/\p{Script=Han}/gu)?.length ?? 0;
  const other = text.replace(/\p{Script=Han}/gu, " ");
  return han + (other.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:['’\-][\p{L}\p{N}][\p{L}\p{M}\p{N}]*)*/gu)?.length ?? 0);
}
