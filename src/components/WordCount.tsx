"use client";
import { useLabels } from "./Labels";

export default function WordCount({ count }: { count: number }) {
  const t = useLabels();
  return <span className="word-count" title={t.word_count_hint} data-word-count={count}>{(count === 1 ? t.word_count_one : t.word_count).replace("{count}", String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ","))}</span>;
}
