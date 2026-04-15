"use client";

import { useState, useCallback } from "react";
import alphabetData from "@/data/alphabet.json";
import { AlphabetEntry, GameMode } from "@/types/alphabet";
import AlphabetCard from "@/components/AlphabetCard";
import Keyboard from "@/components/Keyboard";
import ProgressBar from "@/components/ProgressBar";
import { speakLetterAndWord } from "@/lib/audio";

type AnswerState = "correct" | "incorrect" | "idle";

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}



export default function AlphabetPage() {
  const [mode, setMode] = useState<GameMode>("practice");
  const [filterMode, setFilterMode] = useState<
    "all" | "smart" | "random" | "daily"
  >("all");

  // Deck of letters to study
  const [deck, setDeck] = useState<AlphabetEntry[]>(
    alphabetData as AlphabetEntry[]
  );
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(mode === "practice");

  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [completedLetters, setCompletedLetters] = useState<Set<string>>(
    new Set()
  );
  const [starredLetters, setStarredLetters] = useState<Set<string>>(new Set());
  const [liveMetrics, setLiveMetrics] = useState({ coverage: 0, accuracy: 0 });

  // Challenge mode UI state
  const [lastSelected, setLastSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [keyboardDisabled, setKeyboardDisabled] = useState(false);

  const current = deck[index] ?? (alphabetData[0] as AlphabetEntry);

  // ── Mode switching ──────────────────────────────────────────────
  const handleSetMode = (m: GameMode) => {
    setMode(m);
    setShowAnswer(m === "practice");
    resetRound();
  };

  const handleSetFilter = (
    f: "all" | "vowel" | "consonant" | "smart" | "random" | "daily"
  ) => {
    setFilterMode(f as any);
    setIndex(0);
    setLastSelected(null);
    setAnswerState("idle");

    const all = alphabetData as AlphabetEntry[];
    let newDeck: AlphabetEntry[] = all;

    if (f === "daily") {
      newDeck = [getTodayLetter(all)];
    } else if (f === "random") {
      newDeck = shuffleArray(all);
    } else if (f === "smart") {
      const incomplete = all.filter((e) => !completedLetters.has(e.letter));
      const done = all.filter((e) => completedLetters.has(e.letter));
      newDeck = shuffleArray(incomplete).concat(shuffleArray(done));
    } else if (f === "vowel" || f === "consonant") {
      newDeck = all.filter((e) => e.category === f);
    } else {
      newDeck = all;
    }

    setDeck(newDeck);
    if (newDeck[0]) speakLetterAndWord(newDeck[0].letter, newDeck[0].word);
  };

  const resetRound = () => {
    setIndex(0);
    setLastSelected(null);
    setAnswerState("idle");
    setKeyboardDisabled(false);
  };

  // ── Navigation ──────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % deck.length);
    setShowAnswer(mode === "practice");
    setLastSelected(null);
    setAnswerState("idle");
    setKeyboardDisabled(false);
    setLiveMetrics({ coverage: 0, accuracy: 0 });

    // Auto speak next
    const nextItem = deck[(index + 1) % deck.length];
    if (nextItem) speakLetterAndWord(nextItem.letter, nextItem.word);
  }, [deck, index, mode]);

  const handleDone = (score?: number, starCount?: number) => {
    setTotalAttempts((n) => n + 1);
    if (score !== undefined && score >= 20) {
      setCorrectCount((n) => n + 1);
    }
    setCompletedLetters((prev) => {
      const next = new Set(prev);
      const activeLetter = letterCase === "upper" ? current.letter : current.lowercase;
      next.add(activeLetter);
      return next;
    });
    if (starCount === 3) {
      setStarredLetters((prev) => {
        const next = new Set(prev);
        const activeLetter = letterCase === "upper" ? current.letter : current.lowercase;
        next.add(activeLetter);
        return next;
      });
    }
  };

  const handleRedraw = () => {
    speakLetterAndWord(current.letter, current.word);
  };

  // ── Challenge keyboard ──────────────────────────────────────────
  const handleSelect = (letter: string) => {
    if (keyboardDisabled) return;

    if (mode === "practice") {
      // Find the index of the clicked letter in the current deck
      const newIndex = deck.findIndex(
        (e) => e.letter.toLowerCase() === letter.toLowerCase()
      );

      if (newIndex !== -1) {
        setIndex(newIndex);
        const targetEntry = deck[newIndex];
        speakLetterAndWord(targetEntry.letter, targetEntry.word);
      } else {
        // If not in current filtered deck, find in full alphabet and reset
        const fullIndex = alphabetData.findIndex(
          (e) => e.letter.toLowerCase() === letter.toLowerCase()
        );
        if (fullIndex !== -1) {
          setDeck(alphabetData as AlphabetEntry[]);
          setFilterMode("all");
          setIndex(fullIndex);
          const targetEntry = alphabetData[fullIndex] as AlphabetEntry;
          speakLetterAndWord(targetEntry.letter, targetEntry.word);
        }
      }
      return;
    }

    // Challenge Mode Logic
    setTotalAttempts((n) => n + 1);
    setLastSelected(letter);

    const target = letterCase === "upper" ? current.letter : current.lowercase;

    if (letter === target) {
      setAnswerState("correct");
      setCorrectCount((n) => n + 1);
      setCompletedLetters((prev) => {
        const next = new Set(prev);
        next.add(current.letter);
        return next;
      });
      setKeyboardDisabled(true);
      setTimeout(() => goNext(), 900);
    } else {
      setAnswerState("incorrect");
      setKeyboardDisabled(true);
      setShowAnswer(true);
      setTimeout(() => {
        setKeyboardDisabled(false);
        setLastSelected(null);
        setAnswerState("idle");
      }, 1200);
    }
  };

  const [autoSpeak, setAutoSpeak] = useState(false);
  const handleAutoSpeak = () => setAutoSpeak((v) => !v);
  const [letterCase, setLetterCase] = useState<"upper" | "lower">("upper");

  const allData = alphabetData as AlphabetEntry[];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Top Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-100">A</div>
          <span className="font-extrabold text-slate-800 text-base sm:text-lg tracking-tight truncate">
            Alphabet Academy
          </span>
        </a>
        <div className="flex items-center gap-1.5 sm:gap-3 ml-2">
          <button className="hidden sm:flex items-center gap-1 text-xs sm:text-sm text-slate-500 hover:text-indigo-600 px-2.5 py-1.5 rounded-full border border-slate-200 hover:border-indigo-300 transition">
            <span>📊</span> 統計
          </button>
          <button className="flex items-center gap-1 text-xs sm:text-sm bg-pink-50 text-pink-600 px-2.5 py-1.5 rounded-full font-bold border border-pink-100">
            <span>👶</span> 幼兒
          </button>
          <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-1.5">
            <span>⭐</span>
            <span className="font-bold text-yellow-600 text-xs sm:text-sm">
              {correctCount}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center max-w-xl mx-auto w-full px-4 pt-4 pb-12 gap-5">
        {/* ── Case Toggle + Auto-speak ──────────────────────────────── */}
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex bg-white rounded-2xl p-1 border border-slate-200 shadow-sm">
            <button
              onClick={() => setLetterCase("upper")}
              className={`px-6 py-2 rounded-xl text-lg font-black transition-all ${letterCase === "upper" ? "bg-indigo-600 text-white shadow-md scale-105" : "text-slate-400 hover:text-indigo-600"}`}
            >
              A
            </button>
            <button
              onClick={() => setLetterCase("lower")}
              className={`px-6 py-2 rounded-xl text-lg font-black transition-all ${letterCase === "lower" ? "bg-indigo-600 text-white shadow-md scale-105" : "text-slate-400 hover:text-indigo-600"}`}
            >
              a
            </button>
          </div>

          <button
            onClick={handleAutoSpeak}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold border transition-all ${autoSpeak
              ? "bg-indigo-100 border-indigo-300 text-indigo-700"
              : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
              }`}
          >
            <span>🔊</span> 自動唸
          </button>
        </div>

        {/* ── Mode Tabs ──────────────────────────────────────── */}
        <div className="w-full flex rounded-2xl bg-white border border-slate-200 p-1 shadow-sm">
          {(["practice", "challenge"] as GameMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleSetMode(m)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${mode === m
                ? "bg-indigo-600 text-white shadow-lg scale-[1.02] z-10"
                : "text-slate-500 hover:text-indigo-600"
                }`}
            >
              {m === "practice" ? (
                <>
                  <span>✏️</span> 練習模式
                </>
              ) : (
                <>
                  <span>⚡</span> 挑戰模式
                </>
              )}
            </button>
          ))}
        </div>

        {/* ── Filter Chips ────────────────────────── */}
        <div className="w-full flex flex-wrap gap-2 justify-center">
          {[
            { key: "all", label: "全部 A–Z", color: "indigo", emoji: "🔤" },
            { key: "vowel", label: "母音 A E I O U", color: "pink", emoji: "👄" },
            { key: "consonant", label: "子音 B C D...", color: "blue", emoji: "🗣️" },
            { key: "smart", label: "智能挑戰", color: "green", emoji: "🧬" },
            { key: "random", label: "隨機", color: "purple", emoji: "🔀" },
            { key: "daily", label: "今日", color: "amber", emoji: "📅" },
          ].map(({ key, label, color, emoji }) => (
            <button
              key={key}
              onClick={() => handleSetFilter(key as any)}
              className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold border transition-all flex items-center gap-1.5 ${filterMode === key
                ? color === "green"
                  ? "bg-green-100 border-green-400 text-green-700 shadow-sm"
                  : color === "purple"
                    ? "bg-purple-100 border-purple-400 text-purple-700 shadow-sm"
                    : color === "indigo"
                      ? "bg-indigo-600 border-indigo-700 text-white shadow-lg"
                      : color === "pink"
                        ? "bg-pink-100 border-pink-400 text-pink-700 shadow-sm"
                        : color === "blue"
                          ? "bg-blue-100 border-blue-400 text-blue-700 shadow-sm"
                          : "bg-amber-100 border-amber-400 text-amber-700 shadow-sm"
                : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:bg-slate-50 shadow-sm"
                }`}
            >
              <span>{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        {/* ── Progress ───────────────────────────────────────── */}
        <div className="w-full bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <ProgressBar
            current={completedLetters.size}
            total={allData.length}
            coverage={liveMetrics.coverage}
            accuracy={liveMetrics.accuracy}
          />
        </div>

        {/* ── Card ───────────────────────────────────────────── */}
        <div className="w-full">
          <AlphabetCard
            key={`${current.letter}-${mode}-${letterCase}`}
            entry={current}
            showAnswer={showAnswer}
            letterCase={letterCase}
            onRedraw={handleRedraw}
            onDone={handleDone}
            onNext={goNext}
            onLiveMetrics={setLiveMetrics}
          />
        </div>

        {/* ── Keyboard Area ────────────────────────── */}
        <div className="w-full transition-all">
          <div className="bg-blue-50/50 rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            {mode === "challenge" && !showAnswer && (
              <p className="text-xs sm:text-sm text-slate-400 text-center mb-5 font-bold tracking-wide uppercase">
                點選正確的字母 👇
              </p>
            )}
            <Keyboard
              displayLetters={alphabetData.map(e => letterCase === "upper" ? e.letter : e.lowercase)}
              onSelect={handleSelect}
              lastSelected={lastSelected}
              answerState={answerState}
              disabled={keyboardDisabled}
              starredLetters={starredLetters}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function getTodayLetter(data: AlphabetEntry[]): AlphabetEntry {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
    86400000
  );
  return data[dayOfYear % data.length] as AlphabetEntry;
}
