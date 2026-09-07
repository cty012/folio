import fs from "node:fs";
import path from "node:path";
import english from "../../data/locales/en.json";
export type Dictionary = typeof english;
export function getLanguage() {
  const settings = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/settings.json"), "utf8"));
  return typeof settings.language === "string" && /^[a-z]{2}(-[a-z]{2})?$/.test(settings.language) ? settings.language : "en";
}
export function getDictionary(): Dictionary {
  const file = path.join(process.cwd(), "data/locales", `${getLanguage()}.json`);
  return fs.existsSync(file) ? { ...english, ...JSON.parse(fs.readFileSync(file, "utf8")) } : english;
}
