export default function SegmentedControl({ activeIndex, choices, onChange }: { activeIndex: number; choices: string[]; onChange: (index: number, value: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-semibold text-slate-700 dark:text-slate-300">Group By:</span>
      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-full">
        {choices.map((choice, index) => (
          <button
            key={index}
            onClick={() => onChange(index, choice)}
            className={`px-4 py-1 rounded-full transition-colors text-sm sm:text-base cursor-pointer ${
              activeIndex === index
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                : "bg-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}
