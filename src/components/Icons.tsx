import type { CSSProperties } from "react";

const paths = {
  book: "M4 3h6a3 3 0 0 1 3 3v15a4 4 0 0 0-4-2H4V3Zm9 3a3 3 0 0 1 3-3h4v16h-3a4 4 0 0 0-4 2",
  plus: "M12 5v14M5 12h14",
  edit: "m16 3 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5Z",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  back: "M20 12H4m6-6-6 6 6 6",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  close: "m6 6 12 12M6 18 18 6",
  up: "m6 14 6-6 6 6",
  down: "m6 10 6 6 6-6",
  list: "M8 6h12M8 12h12M8 18h12M3 6h.01M3 12h.01M3 18h.01",
  check: "m5 12 4 4L19 6",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  sun: "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m-12.8 0L7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  moon: "M20 14.2A8 8 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2Z",
  auto: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0v18m0-13h7.9M12 12h9m-9 4h7.9",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  bookmark: "M6 3h12v18l-6-4-6 4V3Z",
  folder: "M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z",
} as const;
export function Icon({ name, size = 18, style }: { name: keyof typeof paths; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === "more" ? 3 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>;
}
