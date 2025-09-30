import Link from 'next/link';
import { Novel } from "@/lib/definitions";

export default function NovelCard({ novel }: { novel: Novel }) {
  return (
    <Link href={`/novels/${novel.id}`} key={novel.id}>
      <div
        className="
          h-full
          p-6 border rounded-lg bg-slate-50 border-slate-200
          dark:bg-slate-800 dark:border-slate-700

          transition-all duration-300 ease-in-out
          hover:bg-slate-200 hover:border-slate-300
          dark:hover:bg-slate-700 dark:hover:border-slate-500
        "
      >
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{novel.title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{novel.author} • {novel.genre} • {novel.date}</p>
        <p className="mt-2 text-slate-700 dark:text-slate-300">{novel.description}</p>
      </div>
    </Link>
  );
}
