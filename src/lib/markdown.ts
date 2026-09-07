import { remark } from "remark";
import html from "remark-html";

export async function renderMarkdown(markdown: string) {
  return String(await remark().use(html).process(markdown));
}
