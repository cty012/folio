import { getAllNovels } from "@/lib/data";
import { getDictionary } from "@/lib/dictionary";
import NovelList from "@/components/NovelList";

export default function Home() {
  const dictionary = getDictionary();
  const novels = getAllNovels();

  return <NovelList dictionary={dictionary} novels={novels} />;
}
