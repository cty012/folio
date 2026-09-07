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
} as const;
export function Icon({ name, size = 18, style }: { name: keyof typeof paths; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>;
}
