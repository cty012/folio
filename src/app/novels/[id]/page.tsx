import Link from "next/link";
import { notFound } from "next/navigation";
import { getNovelById, getAllNovels } from "@/lib/data";
import { getDictionary } from "@/lib/dictionary";
import HomeButton from "@/components/HomeButton";

// This function tells Next.js which pages to build
export async function generateStaticParams() {
  const novels = getAllNovels();
  return novels.map((novel) => ({
    id: novel.id,
  }));
}

function fillTemplate(str: string, values: Record<string, string | number>) {
  return str.replace(/{(.*?)}/g, (_, key) => String(values[key]));
}

export default async function NovelPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const dictionary = getDictionary();
  const novel = getNovelById(id);

  if (!novel) {
    notFound();
  }

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <HomeButton />

      {/* Header Section */}
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-slate-100">{novel.title}</h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">{dictionary.by} {novel.author}</p>
      </div>
      
      {/* Metadata and Description */}
      <div className="mb-12">
        <div className="flex justify-center gap-4 mb-6">
          <span className="bg-slate-200 text-slate-700 text-sm font-medium px-3 py-1 rounded-full dark:bg-slate-700 dark:text-slate-200">{novel.genre}</span>
          <span className="bg-slate-200 text-slate-700 text-sm font-medium px-3 py-1 rounded-full dark:bg-slate-700 dark:text-slate-200">{dictionary.date}: {novel.date}</span>
          <span className="bg-slate-200 text-slate-700 text-sm font-medium px-3 py-1 rounded-full dark:bg-slate-700 dark:text-slate-200">{dictionary.status}: {dictionary[novel.status]}</span>
        </div>
        <p className="text-slate-800 dark:text-slate-200 leading-relaxed text-center sm:text-lg">{novel.description}</p>
      </div>

      {/* Chapter List */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-center text-slate-900 dark:text-slate-100">{dictionary.table_of_contents}</h2>
        <div className="border rounded-lg overflow-hidden border-slate-200 dark:border-slate-700">
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {novel.chapters.map((chapter) => (
              <li key={chapter.number}>
                <Link
                  href={`/novels/${novel.id}/chapter-${chapter.number}`} 
                  className="block px-6 py-4 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {fillTemplate(dictionary.chapter, { number: chapter.number })}:
                  </span>
                  <span className="ml-2 text-slate-900 dark:text-slate-100">
                    {chapter.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
