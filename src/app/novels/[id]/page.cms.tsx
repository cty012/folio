import { requireLocalPage } from "@/lib/local-page";
import { notFound } from "next/navigation";
import { readNovel, workspaceNovel, listGenres } from "@/lib/content-store";
import NovelManager from "@/components/cms/NovelManager";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  await requireLocalPage();
  const novel = readNovel((await params).id);
  return { title: novel ? `${novel.title} · Folio` : "Folio" };
}
export default async function NovelPage({ params }: { params: Promise<{ id: string }> }) {
  await requireLocalPage();
  const { id } = await params;
  if (!readNovel(id)) notFound();
  return <NovelManager key={id} initialNovel={workspaceNovel(id)} genres={listGenres()} />;
}
