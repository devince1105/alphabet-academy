interface ProgressBarProps {
  current: number;  // completed letters count (unused in ring, kept for future)
  total: number;
  coverage: number; // live drawing coverage % — shown in ring
  accuracy: number; // live drawing accuracy %
}

export default function ProgressBar({
  coverage,
  accuracy,
}: ProgressBarProps) {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-3">
        {/* Ring: coverage % */}
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
              stroke="#e8e4ff"
              strokeWidth="5"
            />
            <circle
              cx="28"
              cy="28"
              r="22"
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

        {/* Text: 覆蓋 X% • 準度 X% */}
        <div className="flex gap-1 text-sm font-medium text-slate-500 items-center">
          <span className="text-base">📊</span>
          <span className="inline-flex items-center gap-1">
            覆蓋{" "}
            <span className="text-indigo-600 font-bold">{coverage}%</span>
          </span>
          <span className="text-slate-300 mx-1">•</span>
          <span className="inline-flex items-center gap-1">
            準度{" "}
            <span className="text-indigo-600 font-bold">{accuracy}%</span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${coverage}%` }}
        />
      </div>
    </div>
  );
}
