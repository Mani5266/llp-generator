"use client";
import { useTheme } from "../ThemeProvider";

interface Props {
  onRestart: () => void;
  onBackToDashboard?: () => void;
}

export default function ChatHeader({ onRestart, onBackToDashboard }: Props) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-[var(--bg-header)] shrink-0 border-b border-white/5">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-gradient)] flex items-center justify-center shadow-[0_2px_8px_rgba(13,150,104,0.3)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div>
          <div className="text-[15px] font-bold text-[#f0f4f8] tracking-tight">Deed AI</div>
          <div className="text-[11px] text-[#64748b] font-medium mt-0.5">LLP Agreement Assistant</div>
        </div>
      </div>
      <div className="flex gap-1.5 items-center">
        <button 
          className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/70 hover:text-white" 
          onClick={toggle} 
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
        {onBackToDashboard && (
          <button 
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/70 hover:text-white" 
            onClick={onBackToDashboard} 
            title="Dashboard"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </button>
        )}
        <button 
          className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/70 hover:text-white" 
          onClick={() => { if (confirm("Are you sure you want to restart? All your progress will be lost.")) onRestart(); }} 
          title="Restart"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>
      </div>
    </div>
  );
}
