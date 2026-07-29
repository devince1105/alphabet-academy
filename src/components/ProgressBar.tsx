interface ProgressBarProps {
  coverage: number;   // 覆蓋 % (overlapRatio × 100)
  accuracy: number;   // 準度 % (precision × 100)
  wrongArea: number;  // 畫在容錯字形外的 %
  overflow: number;   // 畫在字形包圍盒外的 %
  inkRatio: number;   // 使用墨跡相對於模板面積的 %
  trajectoryQuality: number;
  directionStructure: number;
  current: number;    // 已完成字母數
  total: number;      // 總字母數
}

export default function ProgressBar({
  coverage,
  accuracy,
  wrongArea,
  overflow,
  inkRatio,
  trajectoryQuality,
  directionStructure,
  current,
  total,
}: ProgressBarProps) {
  const metricTone = (value: number, lowerIsBetter = false) => {
    const good = lowerIsBetter ? value <= 25 : value >= 70;
    const warning = lowerIsBetter ? value <= 50 : value >= 40;
    return good
      ? "text-emerald-600"
      : warning
        ? "text-amber-600"
        : "text-rose-500";
  };

  return (
    <div className="w-full flex items-start gap-3">
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

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-slate-500">
          <span>📊 覆蓋 <span className="text-indigo-600 font-bold">{coverage}%</span></span>
          <span>準度 <span className={metricTone(accuracy)}>{accuracy}%</span></span>
          <span className="ml-auto text-xs text-slate-400">
            完成 {current}/{total}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-1.5 text-[11px] sm:text-xs font-bold">
          <span className="text-slate-500">
            錯誤區域{" "}
            <span className={metricTone(wrongArea, true)}>{wrongArea}%</span>
          </span>
          <span className="text-slate-500">
            溢出{" "}
            <span className={metricTone(overflow, true)}>{overflow}%</span>
          </span>
          <span className="text-slate-500">
            墨跡{" "}
            <span className={metricTone(inkRatio > 100 ? inkRatio - 100 : 0, true)}>
              {inkRatio}%
            </span>
          </span>
          <span className="text-slate-500">
            軌跡{" "}
            <span className={metricTone(trajectoryQuality)}>
              {trajectoryQuality}%
            </span>
          </span>
          <span className="text-slate-500">
            結構{" "}
            <span className={metricTone(directionStructure)}>
              {directionStructure}%
            </span>
          </span>
        </div>

        <p className="text-[10px] leading-relaxed text-slate-400">
          三星參考：覆蓋 ≥58%、準度 ≥76%、錯誤區域 ≤24%、溢出 ≤28%、
          墨跡 ≤145%、結構完整
        </p>
      </div>
    </div>
  );
}
