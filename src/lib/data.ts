import fs from "fs";
import path from "path";
import { remark } from "remark";
import html from "remark-html";
import { Novel } from "@/lib/definitions";

// Get the absolute path to the data directory
const dataDirectory = path.join(process.cwd(), "data");
const novelsDirectory = path.join(dataDirectory, "novels");

export function getAllNovels(): Novel[] {
  // Get all folder names under data/novels/ which represent the book IDs
  const bookIds = fs.readdirSync(novelsDirectory);

  const allNovels = bookIds.map(id => {
    const fullPath = path.join(novelsDirectory, id, "index.json");
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const novelData = JSON.parse(fileContents) as Novel;

    return {
      ...novelData,
      id: id,
    };
  });

  return allNovels;
}

export function getNovelById(id: string): Novel | undefined {
  const fullPath = path.join(novelsDirectory, id, "index.json");

  try {
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const novelData = JSON.parse(fileContents) as Novel;
    return {
      ...novelData,
      id: id,
    };
  } catch (error) {
    // If the file doesn't exist, return undefined
    return undefined;
  }
}

export async function getChapter(id: string, number: number) {
  const novel = getNovelById(id);
  if (!novel) return null;

  const chapterIndex = novel.chapters.findIndex(c => c.number === number);
  if (chapterIndex === -1) return null;
  
  const chapter = novel.chapters[chapterIndex];

  // Construct the path to the markdown file `chapter-[number].md`
  const mdFileName = `chapter-${chapter.number}.md`;
  const fullPath = path.join(novelsDirectory, id, mdFileName);
  
  let fileContents = "";
  try {
    fileContents = fs.readFileSync(fullPath, "utf8");
  } catch {
    // If the file doesn't exist, we can show a message.
    fileContents = `*Chapter content for "${chapter.title}" is not available yet.*`;
  }

  // Use remark to convert markdown into HTML string
  const processedContent = await remark()
    .use(html)
    .process(fileContents);
  const contentHtml = processedContent.toString();

  return {
    ...chapter,
    contentHtml,
    prevChapter: novel.chapters[chapterIndex - 1] || null,
    nextChapter: novel.chapters[chapterIndex + 1] || null,
  };
}
