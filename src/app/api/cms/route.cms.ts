import { ContentError, listNovels, mutateContent, workspaceNovel, listGenres, mutateGenres, deleteNovel } from "@/lib/content-store";
import { renderMarkdown } from "@/lib/markdown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request, write = false) {
  if (process.env.FOLIO_MODE !== "cms") throw new ContentError("Not found.", 404);
  const url = new URL(request.url);
  const host = request.headers.get("host");
  if (!host || !/^(127\.0\.0\.1|localhost|\[::1\])(:[0-9]+)?$/.test(host))
    throw new ContentError("The writing workspace is only available on this computer.", 403);
  const origin = request.headers.get("origin");
  if ((origin && origin !== `${url.protocol}//${host}`) || request.headers.get("sec-fetch-site") === "cross-site")
    throw new ContentError("Cross-site requests are not allowed.", 403);
  if (write && (!origin || !request.headers.get("content-type")?.startsWith("application/json")))
    throw new ContentError("Writes require a same-origin JSON request.", 403);
}

function failure(error: unknown) {
  return Response.json({ error: error instanceof ContentError ? error.message : "Unable to access the content folder. Check the server log." },
    { status: error instanceof ContentError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    authorize(request);
    const params = new URL(request.url).searchParams;
    if (params.has("genres")) return Response.json(listGenres(), { headers: { "Cache-Control": "no-store" } });
    const id = params.get("id");
    return Response.json(id ? workspaceNovel(id) : listNovels().map(novel => ({
      id: novel.id, title: novel.title, author: novel.author,
      publication: novel.publication, chapterCount: novel.chapters.length,
    })), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { console.error(error); return failure(error); }
}

export async function POST(request: Request) {
  try {
    authorize(request, true);
    // Stream-limit before parsing, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) throw new ContentError("Missing request body.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8_100_000) { await reader.cancel(); throw new ContentError("Request is too large.", 413); }
      chunks.push(value);
    }
    let input;
    try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new ContentError("Invalid JSON."); }
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new ContentError("Invalid request.");
    if (input.action === "preview") {
      if (typeof input.markdown !== "string" || input.markdown.length > 2_000_000) throw new ContentError("Invalid chapter content.");
      return Response.json({ html: await renderMarkdown(input.markdown) }, { headers: { "Cache-Control": "no-store" } });
    }
    const result = input.action === "deleteNovel" ? deleteNovel(input)
      : input.action === "createGenre" || input.action === "renameGenre" ? mutateGenres(input) : mutateContent(input);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { console.error(error); return failure(error); }
}
