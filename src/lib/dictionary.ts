import fs from "fs";
import path from "path";

const dataDirectory = path.join(process.cwd(), "data");
const localesDirectory = path.join(dataDirectory, "locales");

// A simple cache to avoid re-reading files on the same build
let dictionary: any = null;

export function getDictionary() {
  if (dictionary) {
    return dictionary;
  }
  
  // 1. Read the settings file to find the active language
  const settingsPath = path.join(dataDirectory, "settings.json");
  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  const lang = settings.language || "en"; // Default to "en" if not specified
  console.log(`Loading dictionary for language: ${lang}`);

  // 2. Read the appropriate dictionary file
  const dictionaryPath = path.join(localesDirectory, `${lang}.json`);
  dictionary = JSON.parse(fs.readFileSync(dictionaryPath, "utf8"));
  
  return dictionary;
}
