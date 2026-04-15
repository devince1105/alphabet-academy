"use client";

import { useState, useRef, useEffect } from "react";
import { AlphabetEntry } from "@/types/alphabet";
import AudioButton from "./AudioButton";
import DrawingCanvas, { DrawingCanvasHandle } from "./DrawingCanvas";
import { speakPraise } from "@/lib/audio";

interface AlphabetCardProps {
  entry: AlphabetEntry;
  showAnswer: boolean;
  letterCase: "upper" | "lower";
  onRedraw: () => void;
  onDone: (score?: number, starCount?: number) => void;
  onNext: () => void;
  onLiveMetrics?: (metrics: { coverage: number; accuracy: number }) => void;
}

export default function AlphabetCard({
  entry,
  showAnswer,
  letterCase,
  onRedraw,
  onDone,
  onNext,
  onLiveMetrics,
}: AlphabetCardProps) {
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [metrics, setMetrics] = useState<{ coverage: number; accuracy: number } | null>(null);

  const starCount = metrics
    ? (
      (metrics.coverage >= 40 && metrics.accuracy >= 45) || (metrics.coverage >= 15 && metrics.accuracy >= 80)
        ? 3
        : (metrics.coverage >= 10 && metrics.accuracy >= 25)
          ? 2
          : 1
    )
    : 0;

  useEffect(() => {
    if (metrics) {
      speakPraise(starCount);
    }
  }, [metrics, starCount]);

  const handleDone = () => {
    if (canvasRef.current) {
      const m = canvasRef.current.getMetrics();
      setMetrics(m);
      const sc =
        (m.coverage >= 40 && m.accuracy >= 45) || (m.coverage >= 15 && m.accuracy >= 80)
          ? 3
          : (m.coverage >= 10 && m.accuracy >= 25)
          ? 2
          : 1;
      onDone((m.coverage + m.accuracy) / 2, sc);
    } else {
      onDone();
    }
  };

  const handleRedraw = () => {
    canvasRef.current?.clear();
    setMetrics(null);
    onLiveMetrics?.({ coverage: 0, accuracy: 0 });
    onRedraw();
  };

  return (
    <div className="relative w-full rounded-[3rem] bg-indigo-50/30 shadow-2xl shadow-indigo-100/30 border border-white p-5 sm:p-8 flex flex-col items-center transition-all duration-500 overflow-hidden text-center gap-5">

      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/50 rounded-full blur-[100px] -mr-32 -mt-32" />

      {/* Main Row: Canvas + Sidebar */}
      <div className="relative z-10 w-full flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">

        {/* Canvas Area */}
        <div className="relative w-full max-w-[420px] aspect-square order-1 flex-shrink-0 flex items-center justify-center bg-white/80 rounded-[2rem] overflow-hidden"
          style={{ border: "2.5px dashed rgba(180, 190, 230, 0.6)" }}
        >


          <div className="relative w-full h-full z-20">
            <DrawingCanvas
              ref={canvasRef}
              letter={letterCase === "upper" ? entry.letter : entry.lowercase}
              strokeWidth={26}
              showGuide={!metrics}
              onMetricsUpdate={onLiveMetrics}
            />
          </div>

          {/* Score Overlay — covers the canvas */}
          {metrics !== null && (
            <div className="absolute left-3 right-3 bottom-3 bg-white border border-indigo-100 rounded-[2rem] animate-slideUp z-30 p-6 shadow-[0_8px_40px_rgba(79,70,229,0.12)] flex flex-col items-center text-center">
              <div className="flex gap-3 mb-2 justify-center">
                {[1, 2, 3].map((star) => (
                  <div key={star} className={`text-4xl transition-all duration-500 ${star <= starCount ? "scale-110 drop-shadow-md" : "grayscale opacity-15 scale-90"}`}>
                    ⭐
                  </div>
                ))}
              </div>

              <h3 className="text-xl font-black text-slate-800 mb-4 tracking-tight">
                {starCount === 3 ? "三顆星！" : starCount === 2 ? "兩顆星！" : "再加油！"}
              </h3>

              <div className="flex gap-3 w-full justify-center">
                <button
                  onClick={handleRedraw}
                  className="flex-1 max-w-[130px] py-3.5 rounded-2xl bg-slate-100 text-slate-700 font-black hover:bg-slate-200 transition-all text-base flex items-center justify-center gap-2 group"
                >
                  <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"/>
                  </svg>
                  再畫
                </button>

                <button
                  onClick={onNext}
                  className="flex-1 max-w-[180px] py-3.5 rounded-2xl bg-indigo-600 text-white font-black shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all text-base flex items-center justify-center gap-2"
                >
                  <span className="opacity-70">❯</span>
                  換下一個
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar — tighter gap */}
        <div className="flex sm:flex-col items-center justify-center gap-5 order-2">
          <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
            <AudioButton letter={entry.letter} word={entry.word} />
            <span className="text-[11px] font-black text-slate-400 group-hover:text-indigo-600 transition-colors tracking-widest">聽聲音</span>
          </div>

          <button onClick={handleRedraw} className="flex flex-col items-center gap-1.5 group">
            <div className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm group-hover:bg-slate-50 group-hover:border-indigo-200 group-hover:shadow-md group-hover:scale-110 active:scale-95 transition-all duration-300">
              <svg className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </div>
            <span className="text-[11px] font-black text-slate-400 group-hover:text-indigo-600 transition-colors tracking-widest">重畫</span>
          </button>

          <button onClick={handleDone} className="flex flex-col items-center gap-1.5 group">
            <div className="w-14 h-14 rounded-full bg-green-100/60 border-2 border-green-200 flex items-center justify-center shadow-sm group-hover:bg-green-100 group-hover:scale-110 active:scale-90 transition-all duration-300">
              <svg className="w-9 h-9 text-green-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-[11px] font-black text-slate-400 group-hover:text-green-600 transition-colors tracking-widest">好了</span>
          </button>
        </div>
      </div>



      {/* Word card */}
      {showAnswer && (
        <div className="relative z-10 w-full max-w-[480px] animate-fadeIn bg-white/60 backdrop-blur-sm px-8 py-5 rounded-[2rem] border border-indigo-100/60 shadow-sm flex flex-col items-center gap-2">
          <span className="text-5xl sm:text-6xl font-black text-slate-800 tracking-tight text-center break-words w-full">
            {entry.word}
          </span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-2xl font-bold text-indigo-500">
              {entry.translation}
            </span>
            <span className="text-slate-300 text-xl">•</span>
            <span className="text-lg font-medium text-slate-400 font-mono tracking-wider">
              {entry.phonetic}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
