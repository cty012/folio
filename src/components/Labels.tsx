"use client";
import { createContext, useContext } from "react";
import type { Dictionary } from "@/lib/dictionary";
const Context = createContext<Dictionary | null>(null);
export function Labels({ value, children }: { value: Dictionary; children: React.ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLabels() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing language context");
  return value;
}
