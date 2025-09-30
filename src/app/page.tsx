import { getAllNovels } from "@/lib/data";
import NovelList from "@/components/NovelList";

export default function Home() {
  const novels = getAllNovels();

  return <NovelList novels={novels} />;
}
