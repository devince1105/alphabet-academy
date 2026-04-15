"use client";

import { speakLetter, speakWord } from "@/lib/audio";

interface AudioButtonProps {
  letter: string;
  word: string;
}

export default function AudioButton({ letter, word }: AudioButtonProps) {
  const handlePlay = () => {
    speakLetter(letter);
    setTimeout(() => speakWord(word), 700);
  };

  return (
    <button
      onClick={handlePlay}
      className="p-0 border-none bg-transparent outline-none focus:ring-0"
      aria-label={`Play pronunciation of ${letter}`}
    >
      <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm group-hover:bg-white group-hover:border-indigo-300 group-hover:shadow-md group-active:scale-90 transition-all duration-200">
        <svg
          className="w-6 h-6 text-indigo-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </button>
  );
}
