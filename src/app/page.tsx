import Link from "next/link";
import alphabetData from "@/data/alphabet.json";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center px-4 overflow-hidden relative">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />

      <div className="max-w-md w-full text-center space-y-10 relative z-10">
        {/* Hero */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-indigo-600 shadow-xl shadow-indigo-200 text-white text-6xl font-black mb-2 transform hover:rotate-6 transition-transform">
            A
          </div>
          <h1 className="text-5xl font-black text-slate-800 tracking-tight">
            Alphabet Academy
          </h1>
          <p className="text-slate-500 text-lg font-medium">
            Learn to write English letters A–Z<br/>
            Interactive canvas with real-time scoring
          </p>
        </div>

        {/* Letter preview grid */}
        <div className="grid grid-cols-7 gap-3 py-4 place-items-center">
          {(alphabetData as { letter: string }[]).slice(0, 21).map(({ letter }) => (
            <span
              key={letter}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm border border-indigo-100 shadow-sm text-indigo-600 font-black text-lg hover:scale-110 transition-transform"
            >
              {letter}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-4 pt-4">
          <Link
            href="/alphabet"
            className="group relative block w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xl shadow-xl shadow-indigo-200 transition-all active:scale-95 overflow-hidden"
          >
            <span className="relative z-10">Start Learning →</span>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <div className="flex justify-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span>✏️ Writing Mode</span>
            <span>⚡ Challenge</span>
            <span>📊 Smart Scoring</span>
          </div>
        </div>
      </div>
    </div>
  );
}
