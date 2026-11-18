"use client";
import Modal from "./Modal";
import { useLabels } from "../Labels";

export default function DeleteDialog({ kind, title, busy, error, onClose, onConfirm, removesVolume = false }: {
  kind: "novel" | "chapter"; title: string; busy: boolean; error: string;
  onClose: () => void; onConfirm: () => void;
  removesVolume?: boolean;
}) {
  const t = useLabels();
  const label = kind === "novel" ? t.delete_novel : t.delete_chapter;
  return <Modal title={label} busy={busy} onClose={onClose}>
    <p className="delete-title">{title}</p>
    <p className="form-hint">{kind === "novel" ? t.delete_novel_hint : t.delete_chapter_hint}</p>
    <p className="form-hint">{t.delete_export_hint}</p>
    {removesVolume && <p className="feedback">{t.empty_volume_delete}</p>}
    {error && <p className="feedback error" role="alert">{error}</p>}
    <footer className="form-actions"><button className="button" disabled={busy} onClick={onClose}>{t.cancel}</button><button className="button danger" disabled={busy} onClick={onConfirm}>{busy ? t.deleting : label}</button></footer>
  </Modal>;
}
