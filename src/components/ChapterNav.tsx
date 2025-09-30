"use client";

import Link from "next/link";
import { Novel } from "@/lib/definitions";

type ChapterNavProps = {
  novel: Novel;
  currentChapterNumber: number;
};

export default function ChapterNav({ novel, currentChapterNumber }: ChapterNavProps) {
  return (
    <aside className="w-full md:w-64 lg:w-72 md:flex-shrink-0">
      <div className="md:sticky md:top-8">
        <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100">
          <Link href={`/novels/${novel.id}`}>{novel.title}</Link>
        </h3>
        <nav>
          <ul className="border rounded-lg overflow-hidden border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
            {novel.chapters.map((chapter) => (
              <li key={chapter.number}>
                <Link
                  href={`/novels/${novel.id}/chapter-${chapter.number}`}
                  className={`
                    block p-3 text-sm transition-colors
                    ${currentChapterNumber === chapter.number
                      ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }
                  `}
                >
                  {chapter.number}. {chapter.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
