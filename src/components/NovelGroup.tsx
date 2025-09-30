"use client";

import { useMemo } from "react";
import { Novel } from "@/lib/definitions";
import NovelCard from "@/components/NovelCard";

type NovelGroupProps = {
  groupName: string;
  novels: Novel[];
  sortBy: "title" | "date";
};

export default function NovelGroup({ groupName, novels, sortBy }: NovelGroupProps) {
  const sortedNovels = useMemo(() => {
    // We create a new array to avoid mutating the original
    return [...novels].sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      // For dates, we compare them as numbers
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [novels, sortBy]);

  return (
    <section>
      <h2 className="text-2xl font-bold mt-8 mb-4 border-b pb-2">{groupName}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedNovels.map((novel) => (
          <NovelCard key={novel.id} novel={novel} />
        ))}
      </div>
    </section>
  );
}
