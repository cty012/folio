import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/lib/markdown.ts';

test('renders inline and display math with accessible MathML', async () => {
  const html = await renderMarkdown('Energy $E = mc^2$.\n\n$$\n\\frac{1}{2} + \\sqrt{x}\n$$');
  assert.match(html, /class="katex"/);
  assert.match(html, /class="katex-display"/);
  assert.match(html, /<math[^>]+xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/);
  assert.match(html, /<mfrac>/);
  assert.match(html, /<msqrt>/);
  assert.match(html, /class="katex-html" aria-hidden="true"/);
});

test('literal code, escaped currency, images and normal Markdown still work', async () => {
  const html = await renderMarkdown('`$x$`\n\n```text\n$$x$$\n```\n\nPay \\$5 or \\$10. **Bold** [link](https://example.com) ![Folio](/images/folio-logo.svg)');
  assert.doesNotMatch(html, /class="katex/);
  assert.match(html, /<code>\$x\$<\/code>/);
  assert.match(html, /Pay \$5 or \$10/);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /src="\/images\/folio-logo.svg"/);
});

test('math fences render and malformed math leaves a readable error without aborting the chapter', async () => {
  assert.match(await renderMarkdown('```math\nx^2\n```'), /class="katex-display"/);
  const html = await renderMarkdown('Before. $\\frac{$ After.');
  assert.match(html, /class="katex-error"/);
  assert.match(html, /Before/);
  assert.match(html, /After/);
});

test('user HTML, unsafe links and untrusted math commands remain inert', async () => {
  const html = await renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[Bad](javascript:alert%281%29)\n\n$\\href{javascript:alert(1)}{click}$\n\n$\\includegraphics{https://example.com/tracker.png}$\n\n$\\htmlClass{injected}{x}$\n\n$\\invalid{<img src=x onerror=alert(1)>}$');
  assert.doesNotMatch(html, /<script|<img|href="javascript:|class="injected"/i);
  assert.match(html, /katex/);
});

test('macro expansion is bounded and definitions do not leak into another formula', async () => {
  const recursive = await renderMarkdown('$\\def\\a{\\a}\\a$');
  assert.match(recursive, /class="katex-error"/);
  await renderMarkdown('$\\gdef\\folioTestMacro{z}\\folioTestMacro$');
  const next = await renderMarkdown('$\\folioTestMacro$');
  assert.match(next, /<mtext>\\folioTestMacro<\/mtext>/);
  assert.doesNotMatch(next, /<mi>z<\/mi>/);
});

test('tables retain headers, alignment, inline formatting and math in a scrollable wrapper', async () => {
  const html = await renderMarkdown('| Name | Formula | Count |\n| :--- | :---: | ---: |\n| **Mara** | $x^2$ | 3 |\n| east \\| west | `literal` | 4 |');
  assert.match(html, /<div class="markdown-table" tabindex="0"><table>/);
  assert.match(html, /<thead>/);
  assert.match(html, /<th align="left">Name<\/th>/);
  assert.match(html, /<th align="center">Formula<\/th>/);
  assert.match(html, /<td align="right">3<\/td>/);
  assert.match(html, /<strong>Mara<\/strong>/);
  assert.match(html, /class="katex"/);
  assert.match(html, /east \| west/);
  assert.match(html, /<code>literal<\/code>/);
});

test('table syntax in code stays literal and table cells remain sanitized', async () => {
  assert.doesNotMatch(await renderMarkdown('```text\n| A | B |\n| --- | --- |\n| x | y |\n```'), /<table>/);
  const html = await renderMarkdown('| A | B |\n| --- | --- |\n| <img src=x onerror=alert(1)> | [bad](javascript:alert%281%29) |');
  assert.match(html, /<table>/);
  assert.doesNotMatch(html, /<img|onerror=|href="javascript:/);
});
