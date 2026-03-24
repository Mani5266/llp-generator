"use client";

interface Props {
  busy: boolean;
  done: boolean;
  isDark: boolean;
}

export default function ChatStatus({ busy, done, isDark }: Props) {
  return (
    <div className="flex flex-col gap-3.5 mt-2">
      {/* Typing Indicator */}
      {busy && (
        <div className="flex gap-2.5 items-center animate-in fade-in duration-300">
          <div className="w-8.5 h-8.5 rounded-xl bg-[var(--accent-gradient)] flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(13,150,104,0.2)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div className="px-5 py-3.5 rounded-2px-16px-16px-16px bg-[var(--bg-agent-bubble)] border border-[var(--border-light)] shadow-sm flex gap-1.5 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] inline-block animate-bounce [animation-duration:1s]"/>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] inline-block animate-bounce [animation-duration:1s] [animation-delay:0.2s]"/>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] inline-block animate-bounce [animation-duration:1s] [animation-delay:0.4s]"/>
          </div>
        </div>
      )}

      {/* Completion Banner */}
      {done && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border-1.5 leading-relaxed animate-in slide-in-from-bottom-2 duration-400 ${
          isDark 
            ? "bg-[#10b981]/10 border-[#10b981]/20 text-[#34d399]" 
            : "bg-[#059669]/5 border-[#059669]/15 text-[#047857]"
        }`}>
          <div className={`w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center ${
            isDark ? "bg-[#10b981]/15" : "bg-[#059669]/10"
          }`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="flex flex-col">
            <strong className="font-bold tracking-tight">Agreement Complete</strong>
            <div className="text-[12px] opacity-80 mt-0.5">Download your document using the buttons in the preview panel.</div>
          </div>
        </div>
      )}
    </div>
  );
}
