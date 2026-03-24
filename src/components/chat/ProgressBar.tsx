"use client";

interface Props {
  stepNum: number;
  totalSteps: number;
  pct: number;
}

export default function ProgressBar({ stepNum, totalSteps, pct }: Props) {
  return (
    <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-5 py-2.5 flex items-center justify-between shrink-0 transition-colors duration-350">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Step {stepNum} of {totalSteps}</span>
            <span className="text-[13px] font-extrabold text-[var(--accent)] tabular-nums">{pct}%</span>
          </div>
          <div className="h-1 bg-[var(--bg-progress)] rounded-full overflow-hidden relative">
            <div 
              className="h-full rounded-full bg-[var(--accent-gradient)] transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]" 
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
