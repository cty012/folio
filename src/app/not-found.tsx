import Link from "next/link";
import { getDictionary } from "@/lib/dictionary";

export default function NotFound() {
  const dictionary = getDictionary();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
        404 - {dictionary.page_not_found}
      </h2>
      <p className="mt-4 text-slate-600 dark:text-slate-400">
        {dictionary.page_not_found_message}
      </p>
      <Link
        href="/"
        className="
          mt-8 inline-block rounded-md bg-slate-200 px-6 py-3
          font-semibold text-slate-800 transition-colors
          hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200
          dark:hover:bg-slate-600
        "
      >
        {dictionary.back_to_all_novels}
      </Link>
    </div>
  );
}
