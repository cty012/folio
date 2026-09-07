import { getAllNovels } from "@/lib/data";
import LibraryView from "@/components/LibraryView";
export default function Home() { return <LibraryView novels={getAllNovels()} />; }
