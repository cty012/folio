"use client";
import { useEffect, useRef, useState } from "react";
import { useLabels } from "./Labels";

/** Text cut to a few lines (set by CSS) with a toggle that appears only when it overflows. */
export default function Clamp({ text, className = "" }: { text: string; className?: string }) {
  const t = useLabels();
  const paragraph = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const element = paragraph.current;
    if (!element || expanded) return;
    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, expanded]);
  return <div className={`clamp ${className}`}>
    <p ref={paragraph} className={expanded ? "clamp-text expanded" : "clamp-text"}>{text}</p>
    {(overflowing || expanded) && <button type="button" className="text-button clamp-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? t.show_less : t.show_more}</button>}
  </div>;
}
