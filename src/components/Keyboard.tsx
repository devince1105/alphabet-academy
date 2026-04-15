"use client";

type AnswerState = "correct" | "incorrect" | "idle";

interface KeyboardProps {
  displayLetters: string[];
  onSelect: (letter: string) => void;
  lastSelected: string | null;
  answerState: AnswerState;
  disabled?: boolean;
  starredLetters?: Set<string>; // letters that achieved 3 stars
}

export default function Keyboard({
  displayLetters,
  onSelect,
  lastSelected,
  answerState,
  disabled = false,
  starredLetters = new Set(),
}: KeyboardProps) {
  const getButtonStyle = (letter: string) => {
    const isSelected = lastSelected === letter;

    if (isSelected) {
      if (answerState === "correct")
        return "bg-indigo-600 text-white border-indigo-700 scale-105 shadow-lg z-10";
      if (answerState === "incorrect")
        return "bg-red-400 text-white border-red-500 animate-shake";
    }

    return "bg-white text-slate-700 border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 active:scale-95 shadow-sm";
  };

  return (
    <div className="w-full px-2">
      <div className="flex flex-wrap justify-center content-center gap-2 sm:gap-3 max-w-2xl mx-auto">
        {displayLetters.map((letter) => {
          const hasThreeStars = starredLetters.has(letter);

          return (
            <div key={letter} className="relative">
              {/* Star indicator for 3-star letters */}
              {hasThreeStars && (
                <span className="absolute -top-1.5 -right-1.5 text-[11px] leading-none z-10 drop-shadow-sm animate-bounce-once">
                  ⭐
                </span>
              )}
              <button
                onClick={() => !disabled && onSelect(letter)}
                disabled={disabled}
                className={`
                  h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl border-2 text-lg sm:text-xl font-black
                  transition-all duration-200 select-none
                  flex items-center justify-center
                  ${getButtonStyle(letter)}
                  ${hasThreeStars ? "border-yellow-300 bg-yellow-50/50" : ""}
                  ${disabled && !lastSelected ? "opacity-30 cursor-not-allowed scale-95" : "cursor-pointer active:scale-90 hover:scale-105"}
                `}
              >
                {letter}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
