"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import { useLabels } from "./Labels";
import { DEFAULT_SIZE, SIZES, SIZE_KEY, THEME_KEY } from "@/lib/appearance";

type Theme = "auto" | "light" | "dark";
const THEMES = [["auto", "auto", "theme_auto"], ["light", "sun", "theme_light"], ["dark", "moon", "theme_dark"]] as const;

function remember(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  } catch { /* The choice still applies to this page. */ }
}

export default function Appearance() {
  const t = useLabels();
  const container = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("auto");
  const [size, setSize] = useState(DEFAULT_SIZE);

  useEffect(() => {
    // The inline script has normally applied these already. Apply them again here because
    // React resets <html> attributes when it renders a page (such as not-found) on the client.
    let theme: string | null = null, size: string | null = null;
    try { theme = localStorage.getItem(THEME_KEY); size = localStorage.getItem(SIZE_KEY); } catch { /* Defaults apply. */ }
    if (theme === "light" || theme === "dark") { setTheme(theme); document.documentElement.dataset.theme = theme; }
    if (size !== null && Number(size) >= 0 && Number(size) < SIZES && /^\d$/.test(size)) { setSize(Number(size)); document.documentElement.dataset.readingSize = size; }
  }, []);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", dismiss); };
  }, [open]);

  function chooseTheme(next: Theme) {
    setTheme(next);
    if (next === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = next;
    remember(THEME_KEY, next === "auto" ? null : next);
  }
  function chooseSize(next: number) {
    setSize(next);
    if (next === DEFAULT_SIZE) delete document.documentElement.dataset.readingSize; else document.documentElement.dataset.readingSize = String(next);
    remember(SIZE_KEY, next === DEFAULT_SIZE ? null : String(next));
  }

  return <div className="appearance" ref={container}>
    <button className="appearance-toggle" aria-label={t.appearance} title={t.appearance} aria-expanded={open} onClick={() => setOpen(!open)}>Aa</button>
    {open && <div className="appearance-panel" role="group" aria-label={t.appearance}>
      <div>
        <p className="appearance-label">{t.theme}</p>
        <div className="segmented">{THEMES.map(([value, icon, label]) => <button key={value} aria-pressed={theme === value} onClick={() => chooseTheme(value)}><Icon name={icon} size={15} />{t[label]}</button>)}</div>
      </div>
      <div>
        <p className="appearance-label">{t.text_size}</p>
        <div className="size-stepper">
          <button aria-label={t.text_smaller} title={t.text_smaller} disabled={size === 0} onClick={() => chooseSize(size - 1)}>A</button>
          <span className="size-dots" aria-hidden="true">{Array.from({ length: SIZES }, (_, index) => <i key={index} data-on={index <= size ? "" : undefined} />)}</span>
          <button aria-label={t.text_larger} title={t.text_larger} disabled={size === SIZES - 1} onClick={() => chooseSize(size + 1)}>A</button>
        </div>
      </div>
    </div>}
  </div>;
}
