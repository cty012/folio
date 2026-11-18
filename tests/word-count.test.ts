import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countWords } from '../src/lib/word-count.ts';

test('counts empty, punctuation, English, numbers and Chinese text consistently', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords('  … — !!! 👋 '), 0);
  assert.equal(countWords("Don't stop the well-known writer. 2026"), 6);
  assert.equal(countWords('你好，世界！'), 4);
  assert.equal(countWords('你好 Folio world 123'), 5);
  assert.equal(countWords('café cafe\u0301'), 2);
});

test('counts readable Markdown without syntax, image labels, URLs or definitions', () => {
  assert.equal(countWords('# Hello **world**\n\n[Read this](https://example.com/long/path) ![not counted](/images/test.png)\n\n---'), 4);
  assert.equal(countWords('A **bold** word\n\n> Two words\n\n- Another word'), 7);
  assert.equal(countWords('un**break**able'), 1);
  assert.equal(countWords('[Read this][ref]\n\n[ref]: https://example.com "Not counted"'), 2);
  assert.equal(countWords('<!-- hidden comment -->\n\nVisible words.'), 2);
  assert.equal(countWords('`two words`\n\n```text\nthree more words\n```'), 5);
});

test('math is excluded while literal code and escaped currency still count', () => {
  assert.equal(countWords('Energy $E = mc^2$ is conserved.\n\n$$\n\\frac{1}{2}\n$$'), 3);
  assert.equal(countWords('Before$x$after'), 2);
  assert.equal(countWords('```math\nx + y\n```'), 0);
  assert.equal(countWords('`$x$`'), 1);
  assert.equal(countWords('Costs \\$5 or \\$10.'), 4);
});

test('table cell boundaries keep words separate and ignore math and separator rows', () => {
  assert.equal(countWords('| Name | Formula |\n| :--- | ---: |\n| Mara | $x^2$ |\n| Ivo | **two words** |'), 6);
  assert.equal(countWords('| 人物 | 角色 |\n| --- | --- |\n| 小明 | 船长 |'), 8);
});
