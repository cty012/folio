import { remark } from "remark";
import remarkGfm from "remark-gfm";
import type { Root, Element } from "hast";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";

// Keep table semantics while giving wide tables a keyboard-scrollable container.
function scrollableTables() {
  return (tree: Root) => {
    function wrap(parent: Root | Element) {
      parent.children = parent.children.map(child => {
        if (child.type !== "element") return child;
        wrap(child);
        if (child.tagName !== "table") return child;
        return { type: "element", tagName: "div", properties: { className: ["markdown-table"], tabIndex: 0 }, children: [child] } as Element;
      });
    }
    wrap(tree);
  };
}

const renderer = remark()
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  // Sanitize user content before KaTeX adds its own MathML, SVG and styles.
  .use(rehypeSanitize, {
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      code: [["className", /^language-./, "math-inline", "math-display"]],
    },
  })
  .use(rehypeKatex, { trust: false, strict: "ignore", maxExpand: 1000, maxSize: 20 })
  .use(scrollableTables)
  .use(rehypeStringify);

export async function renderMarkdown(markdown: string) {
  return String(await renderer.process(markdown));
}
