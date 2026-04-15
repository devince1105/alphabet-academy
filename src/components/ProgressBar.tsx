interface ProgressBarProps {
  coverage: number;   // 覆蓋 % (overlapRatio × 100)
  accuracy: number;   // 準度 % (precision × 100)
  current: number;    // 已完成字母數
  total: number;      // 總字母數
}

export default function ProgressBar({ coverage, accuracy, current, total }: ProgressBarProps) {
  const completionPct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full flex items-center gap-3">
      {/* Ring: 覆蓋 % */}
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="22" fill="none" stroke="#e8e4ff" strokeWidth="5" />
          <circle
            cx="28" cy="28" r="22"
            fill="none"
            stroke="#6c63ff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 22}`}
            strokeDashoffset={`${2 * Math.PI * 22 * (1 - coverage / 100)}`}
            className="transition-all duration-300"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-indigo-600">
          {coverage}%
        </span>
      </div>

      {/* 三項指標 */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span className="text-base">📊</span>
          <span>覆蓋 <span className="text-indigo-600 font-bold">{coverage}%</span></span>
          <span className="text-slate-200">•</span>
          <span>準度 <span className="text-indigo-600 font-bold">{accuracy}%</span></span>
        </div>
      </div>
    </div>
  );
}
