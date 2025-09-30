export type NovelStatus = "ongoing" | "completed" | "on-hiatus";

export type Novel = {
  id: string;
  title: string;
  genre: string;
  author: string;
  date: string;  // Format: YYYY-MM-DD
  description: string;
  status: NovelStatus;
  chapters: {
    number: number;
    title: string;
  }[];
};
