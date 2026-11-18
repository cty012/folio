"use client";
import { useEffect, useRef } from "react";
import { Icon } from "../Icons";

/** A small overflow menu for secondary actions. Closes on outside press, Escape, or choosing an item. */
export default function Menu({ label, children }: { label: string; children: React.ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent | KeyboardEvent) => {
      const element = menu.current;
      if (element?.open && (event instanceof KeyboardEvent ? event.key === "Escape" : !element.contains(event.target as Node))) element.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", dismiss); };
  }, []);
  return <details className="menu" ref={menu}>
    <summary className="icon-button" aria-label={label} title={label}><Icon name="more" size={20} /></summary>
    <div className="menu-items" onClick={() => { if (menu.current) menu.current.open = false; }}>{children}</div>
  </details>;
}
