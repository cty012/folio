import fs from "fs";
import path from "path";
import { Novel } from "./definitions";

// Get the absolute path to the data directory
const dataDirectory = path.join(process.cwd(), "data");

export function getAllNovels(): Novel[] {
  // Get all folder names under data/ which represent the book IDs
  const bookIds = fs.readdirSync(dataDirectory);

  const allNovels = bookIds.map(id => {
    const fullPath = path.join(dataDirectory, id, "index.json");
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
  const fullPath = path.join(dataDirectory, id, "index.json");

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
