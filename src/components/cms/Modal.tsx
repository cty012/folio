"use client";
import { useEffect, useRef } from "react";
import { Icon } from "../Icons";
import { useLabels } from "../Labels";
export default function Modal({ title, onClose, busy = false, children }: { title: string; onClose: () => void; busy?: boolean; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const t = useLabels();
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} className="edit-dialog" aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="dialog-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} disabled={busy} aria-label={t.close}><Icon name="close" /></button></header>{children}
  </dialog>;
}
