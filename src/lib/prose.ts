/** Classes for rendered chapter text. Justified lines suit Chinese; Latin text,
 * which is not hyphenated here, keeps a ragged right edge instead of wide gaps. */
export function proseClass(html: string) {
  const text = html.replace(/<[^>]*>/g, "");
  const han = text.match(/\p{Script=Han}/gu)?.length ?? 0;
  return han * 3 > text.length ? "prose reader-prose reader-justified" : "prose reader-prose";
}
