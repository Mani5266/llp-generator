"use client";
import { useRef, ChangeEvent, KeyboardEvent } from "react";

interface Props {
  input: string;
  busy: boolean;
  done: boolean;
  isDark: boolean;
  selectedFiles: { file: File, url: string, mimeType: string }[];
  setInput: (v: string) => void;
  onSend: (text: string) => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (idx: number) => void;
}

export default function ChatInput({
  input, busy, done, isDark, selectedFiles,
  setInput, onSend, onFileSelect, onRemoveFile
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(input);
    }
  };

  return (
    <div className="flex flex-col bg-[var(--bg-secondary)] border-t border-[var(--border-color)] shrink-0 transition-colors duration-350">
      <div className="px-4 py-1.5 text-[10.5px] text-[var(--text-faint)] text-center leading-relaxed border-b border-[var(--border-light)]">
        AI-generated legal content requires professional review. Edit any field directly in the document preview.
      </div>

      {done && (
        <div className={`px-4 py-2 text-[12px] font-medium text-center border-b animate-in slide-in-from-top-2 duration-300 ${
          isDark ? "bg-[#10b981]/10 border-[#108981]/15 text-[#34d399]" : "bg-[#059669]/5 border-[#059669]/10 text-[#047857]"
        }`}>
          Draft complete. You can still ask questions or make adjustments.
        </div>
      )}

      {/* File Previews */}
      {selectedFiles.length > 0 && (
        <div className="px-[18px] py-3 flex gap-2.5 overflow-x-auto">
          {selectedFiles.map((f, idx) => (
            <div key={idx} className="relative inline-block shrink-0 group">
              {f.mimeType === "application/pdf" ? (
                <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center border-1.5 gap-0.5 ${isDark ? "bg-[#1a0505] border-red-500/50" : "bg-red-50 border-red-400"}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                  <span className="text-[8px] font-extrabold text-[#ef4444] tracking-wider uppercase">PDF</span>
                </div>
              ) : (
                <img src={f.url} alt="upload preview" className="w-14 h-14 rounded-lg object-cover border-2 border-[var(--accent)]" />
              )}
              <button 
                className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] border-1.5 border-white cursor-pointer z-10 font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
                onClick={() => onRemoveFile(idx)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Row */}
      <div className="p-4 pt-3">
        <div className="flex gap-2 items-end bg-[var(--bg-input)] rounded-2xl border-1.5 border-[var(--border-input)] p-1.5 transition-all focus-within:border-[var(--accent)]">
          <input type="file" accept="image/*,application/pdf" multiple ref={fileInputRef} className="hidden" onChange={onFileSelect} />
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-[var(--text-faint)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-all disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()} 
            disabled={busy}
            title="Attach files"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <textarea
            ref={textareaRef}
            className="flex-1 px-1.5 py-2 text-[13.5px] rounded-lg bg-transparent text-[var(--text-primary)] outline-none resize-none min-h-[36px] max-h-[100px] leading-relaxed disabled:opacity-50"
            value={input}
            placeholder="Type your response..."
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "36px";
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
            }}
            onKeyDown={onKey}
            rows={1}
            disabled={busy}
          />
          <button
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all shadow-sm active:scale-95 disabled:shadow-none disabled:active:scale-100 ${
              (busy || (!input.trim() && selectedFiles.length === 0)) 
                ? "bg-[var(--bg-progress)]" 
                : "bg-[var(--accent-gradient)] shadow-[0_2px_6px_rgba(13,150,104,0.25)]"
            }`}
            onClick={() => onSend(input)}
            disabled={busy || (!input.trim() && selectedFiles.length === 0)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={(busy || (!input.trim() && selectedFiles.length === 0)) ? "var(--text-faint)" : "white"} stroke="none">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
