"use client";

import { useState, useMemo } from "react";
import { Novel } from "@/lib/definitions"; // Make sure Novel is imported
import NovelGroup from "@/components/NovelGroup";
import SegmentedControl from "@/components/SegmentedControl";

// The component now receives novels as a prop
export default function NovelList({ novels }: { novels: Novel[] }) {
  const [groupBy, setGroupBy] = useState<"genre" | "author">("genre");
  const [sortBy, setSortBy] = useState<"date" | "title">("date");

  const groupedNovels = useMemo(() => {
    const groups: { [key: string]: Novel[] } = {};
    novels.forEach(novel => {
      const key = novel[groupBy];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(novel);
    });
    return groups;
  }, [groupBy]);

  // Sort the group names alphabetically
  const sortedGroupKeys = Object.keys(groupedNovels).sort((a, b) => a.localeCompare(b));

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">My Novels</h1>
      
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-x-6 gap-y-4">
        <SegmentedControl
          activeIndex={groupBy === "genre" ? 0 : 1}
          choices={["Genre", "Author"]}
          onChange={(index, value) => {
            setGroupBy(["genre", "author"][index] as "genre" | "author");
          }}
        />
        <SegmentedControl
          activeIndex={sortBy === "date" ? 0 : 1}
          choices={["Date", "Title"]}
          onChange={(index, value) => {
            setSortBy(["date", "title"][index] as "date" | "title");
          }}
        />
      </div>
      
      <div>
        {sortedGroupKeys.map(groupKey => (
          <NovelGroup
            key={groupKey}
            groupName={groupKey}
            novels={groupedNovels[groupKey]}
            sortBy={sortBy}
          />
        ))}
      </div>
    </main>
  );
}
