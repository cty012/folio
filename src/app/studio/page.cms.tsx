import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
// Preserve bookmarks from the first milestone; all writing now happens in place.
export default function OldStudio() { redirect("/"); }
