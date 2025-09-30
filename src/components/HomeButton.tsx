import Link from "next/link";
import { getDictionary } from "@/lib/dictionary";

export default function HomeButton() {
  const dictionary = getDictionary();

  return (
    <div className="mb-8">
      <Link 
        href="/"
        className="
          inline-flex items-center text-sm font-semibold
          text-slate-600 hover:text-slate-900
          dark:text-slate-400 dark:hover:text-slate-100
          transition-colors
        "
      >
        <span aria-hidden="true">&larr;</span>
        <span className="ml-2">{dictionary.back_to_all_novels}</span>
      </Link>
    </div>
  );
}
