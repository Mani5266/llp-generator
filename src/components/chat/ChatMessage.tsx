"use client";
import { LLPData } from "@/types";

export interface Msg { 
  role: "agent" | "user"; 
  content: string; 
  options?: string[]; 
  checkboxes?: string[]; 
  snapshot?: { data: LLPData; step: string; done: boolean }; 
}

interface Props {
  msg: Msg;
  index: number;
  busy: boolean;
  step: string;
  data: LLPData;
  checkedItems: Record<string, boolean>;
  percentageInputs: Record<number, string>;
  onUndo: (idx: number) => void;
  onSend: (text: string) => void;
  onCheckboxChange: (label: string, checked: boolean) => void;
  onPercentageInputChange: (idx: number, val: string) => void;
  onSubmitPercentages: () => void;
}

export default function ChatMessage({
  msg, index, busy, step, data, checkedItems, percentageInputs,
  onUndo, onSend, onCheckboxChange, onPercentageInputChange, onSubmitPercentages
}: Props) {
  const isAgent = msg.role === "agent";

  return (
    <div className={`flex gap-2.5 items-start mb-0.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${isAgent ? "bg-[var(--accent-gradient)] shadow-[0_2px_6px_rgba(13,150,104,0.2)]" : "bg-[var(--bg-header)] text-[#f0f4f8] border-2 border-white/10 text-xs font-bold"}`}>
        {isAgent ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        ) : "You"}
      </div>

      <div className="max-w-[85%] flex flex-col gap-2">
        {/* Bubble */}
        <div className={`px-[18px] py-[14px] text-[13.5px] leading-relaxed break-words whitespace-pre-wrap shadow-sm border transition-all duration-350 ${
          isAgent 
            ? "rounded-2px-16px-16px-16px bg-[var(--bg-agent-bubble)] text-[var(--text-agent)] border-[var(--border-light)]" 
            : "rounded-16px-2px-16px-16px bg-[var(--bg-user-bubble)] text-[var(--text-user)] border-transparent shadow-md"
        }`}>
          {msg.content}
        </div>

        {/* Undo Button (for user messages) */}
        {!isAgent && !busy && msg.snapshot && (
          <button
            onClick={() => onUndo(index)}
            className="self-end text-[11px] text-[var(--text-faint)] hover:text-red-500 transition-colors flex items-center gap-0.5"
            title="Undo to this point"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3v7.7"/></svg>
            Undo
          </button>
        )}

        {/* Suggested Options */}
        {msg.options && (
          <div className="flex flex-wrap gap-2 mt-0.5">
            {msg.options.map((o, j) => {
              const label = typeof o === "object" ? ((o as any).label || (o as any).value || JSON.stringify(o)) : String(o);
              const isYes = label.toLowerCase().startsWith("yes");
              const isNo = label.toLowerCase().startsWith("no");
              return (
                <button
                  key={j}
                  className={`px-5 py-2 rounded-full text-[13px] font-semibold tracking-tight transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 ${
                    isYes ? "bg-gradient-to-br from-[#059669] to-[#10b981] text-white shadow-[#059669]/30" :
                    isNo ? "bg-gradient-to-br from-[#dc2626] to-[#ef4444] text-white shadow-[#dc2626]/25" :
                    "bg-[var(--accent-gradient)] text-white shadow-[#0d9668]/25"
                  }`}
                  onClick={() => onSend(label)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Checkbox Selection */}
        {msg.checkboxes && (
          <div className="bg-[var(--bg-checkbox)] p-4 rounded-xl mt-1 border border-[var(--border-color)] flex flex-col gap-2.5">
            <div className="text-[12px] font-bold text-[var(--accent)] uppercase tracking-wider">Select designated partners</div>
            {msg.checkboxes.map((cb, j) => {
              const label = typeof cb === "object" ? ((cb as any).label || (cb as any).value || JSON.stringify(cb)) : String(cb);
              const isChecked = !!checkedItems[label];
              return (
                <label key={j} className={`flex items-center gap-2.5 cursor-pointer p-2 rounded-lg transition-colors text-[13.5px] ${isChecked ? "bg-[var(--accent-subtle)] font-semibold" : "transparent"}`}>
                  <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={e => onCheckboxChange(label, e.target.checked)} 
                    className="w-4.5 h-4.5 accent-[var(--accent)] cursor-pointer rounded" 
                  />
                  {label}
                </label>
              );
            })}
            <button
              className="px-5 py-2 bg-[var(--bg-header)] text-white text-[13px] font-semibold rounded-full mt-1.5 self-start shadow-sm transition-all hover:brightness-110 active:scale-95"
              onClick={() => {
                const selected = Object.keys(checkedItems).filter(k => checkedItems[k]);
                if (selected.length === 0) { alert("Please select at least one option."); return; }
                onSend(`The selected designated partners are: ${selected.join(", ")}`);
              }}
            >
              Confirm Selection
            </button>
          </div>
        )}

        {/* Percentage Input Widget */}
        {isAgent && index === 0 && !busy && (step === "contributions" || step === "profits") && (
          <div className="bg-[var(--bg-checkbox)] p-4 rounded-xl mt-1 border border-[var(--border-color)] flex flex-col gap-2.5">
            <div className="text-[12px] font-bold text-[var(--accent)] uppercase tracking-wider">
              {step === "contributions" ? "Capital Contribution %" : "Profit & Loss Sharing %"}
            </div>
            {data.partners.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2.5 py-1">
                <span className="text-[13.5px] text-[var(--text-primary)] font-medium flex-1">{p.salutation} {p.fullName || `Partner ${idx+1}`}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min="0" max="100" placeholder="0"
                    value={percentageInputs[idx] ?? ""}
                    onChange={e => onPercentageInputChange(idx, e.target.value)}
                    className="w-16 px-2.5 py-2 text-[13px] text-center font-mono font-medium rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                  <span className="text-[13px] text-[var(--text-faint)] font-bold">%</span>
                </div>
              </div>
            ))}
            <button
              className="px-5 py-2 bg-[var(--accent-gradient)] text-white text-[13px] font-semibold rounded-full mt-1.5 self-start shadow-[0_2px_8px_rgba(13,150,104,0.2)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              disabled={busy}
              onClick={onSubmitPercentages}
            >
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
