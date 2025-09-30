import Link from "next/link";
import { notFound } from "next/navigation";
import { getNovelById, getChapter, getAllNovels } from "@/lib/data";
import { getDictionary } from "@/lib/dictionary";
import ChapterNav from "@/components/ChapterNav";
import HomeButton from "@/components/HomeButton";

// This generates all possible chapter pages at build time
export async function generateStaticParams() {
  const novels = getAllNovels();
  return novels.flatMap(novel => 
    novel.chapters.map(chapter => ({
      id: novel.id,
      chapter: `chapter-${chapter.number}`,
    }))
  );
}

export default async function ChapterPage({ params }: { params: { id: string, chapter: string } }) {
  const { id, chapter } = await params;
  const dictionary = getDictionary();
  const novel = getNovelById(id);
  if (!novel) {
    notFound();
  }

  const chapterNumber = novel.chapters.find(c => `chapter-${c.number}` === chapter)?.number;
  if (!chapterNumber) {
    notFound();
  }

  const chapterData = await getChapter(id, chapterNumber);
  if (!chapterData) {
    notFound();
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <HomeButton />

      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        <ChapterNav novel={novel} currentChapterNumber={chapterNumber} />
        
        <main className="flex-1 min-w-0">
          <article 
            className="prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: chapterData.contentHtml }}
          />
          
          {/* Bottom Navigation */}
          <div className="mt-12 pt-8 border-t dark:border-slate-700 flex flex-col sm:flex-row justify-between gap-4">
            {chapterData.prevChapter ? (
              <Link 
                href={`/novels/${id}/chapter-${chapterData.prevChapter.number}`} 
                className="
                  block p-4 border rounded-lg 
                  bg-slate-50 hover:bg-slate-200 border-slate-200
                  dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700
                  transition-colors text-left
                "
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">&larr; {dictionary.previous_chapter}</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">{chapterData.prevChapter.title}</p>
              </Link>
            ) : <div />}
            
            {chapterData.nextChapter ? (
              <Link 
                href={`/novels/${id}/chapter-${chapterData.nextChapter.number}`} 
                className="
                  block p-4 border rounded-lg 
                  bg-slate-50 hover:bg-slate-200 border-slate-200
                  dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700
                  transition-colors text-right
                "
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">{dictionary.next_chapter} &rarr;</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">{chapterData.nextChapter.title}</p>
              </Link>
            ) : <div />}
          </div>
        </main>
      </div>
    </div>
  );
}
