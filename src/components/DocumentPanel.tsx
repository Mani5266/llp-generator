"use client";
import { useState, useEffect, useRef } from "react";
import { FileText, Download, FileDown, CheckCircle, Pencil, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

/** Strip dangerous HTML */
function sanitizeHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<script[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]*/gi, "")
    .replace(/javascript\s*:/gi, "blocked:")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<iframe[^>]*>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "");
}

interface Props {
  html: string;
  pct: number;
  missing: string[];
  isManual?: boolean;
  onDocx: () => Promise<void>;
  onPDF: () => Promise<void>;
  onSaveHtml?: (html: string) => void;
  onResetHtml?: () => void;
}

export default function DocumentPanel({ html, pct, missing, isManual, onDocx, onPDF, onSaveHtml, onResetHtml }: Props) {
  const [docxBusy, setDocxBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing && contentRef.current) {
      contentRef.current.innerHTML = sanitizeHtml(html || `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:500px;color:#9ca8b7;gap:20px;font-family:'Inter',-apple-system,system-ui,sans-serif">
          <div style="width:72px;height:72px;border-radius:16px;background:#f1f3f9;display:flex;align-items:center;justify-content:center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          </div>
          <div style="text-align:center">
            <p style="font-size:16px;font-weight:700;color:#3e4c5e;margin-bottom:6px">Your LLP Agreement</p>
            <p style="font-size:13px;line-height:1.6;max-width:280px;margin:0 auto">Answer the questions in the chat panel and watch your Partnership Deed come to life.</p>
          </div>
        </div>
      `);
    }
  }, [html, isEditing]);

  const dlDocx = async () => { setDocxBusy(true); try { await onDocx(); } finally { setDocxBusy(false); } };
  const dlPDF  = async () => { setPdfBusy(true);  try { await onPDF();  } finally { setPdfBusy(false);  } };

  const handleEditToggle = () => {
    if (isEditing && onSaveHtml && contentRef.current) {
      onSaveHtml(sanitizeHtml(contentRef.current.innerHTML));
    }
    setIsEditing(!isEditing);
  };

  const copy = () => {
    const el = document.getElementById("deedContent");
    if (!el) return;
    navigator.clipboard.writeText(el.innerText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error("Clipboard write failed:", err);
      alert("Failed to copy to clipboard. Your browser may have denied clipboard access.");
    });
  };

  return (
    <div className="doc-panel">

      {/* ── Header ── */}
      <div className="doc-header">
        {/* Left */}
        <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
          <div className="doc-header-icon">
            <FileText size={16} color="white" />
          </div>
          <div style={{ minWidth:0 }}>
            <div className="doc-header-title">
              Document Preview
              {isManual && (
                <span style={{
                  fontSize:10, fontWeight:700, padding:"2px 8px",
                  borderRadius:9999,
                  background:"rgba(245,158,11,0.1)", color:"#d97706",
                  border:"1px solid rgba(245,158,11,0.2)"
                }}>Manual</span>
              )}
            </div>
            <div className="doc-header-sub">
              {isManual ? "Showing your manual edits" : "Live draft preview"}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0, flexWrap:"wrap" }}>

          {isManual && !isEditing && onResetHtml && (
            <button onClick={onResetHtml} title="Revert to auto-generated version" className="btn-ghost" style={{fontSize:11,padding:"5px 10px"}}>
              Reset
            </button>
          )}

          {missing.length > 0 && (
            <button
              onClick={() => setShowMissing(v => !v)}
              title="Show missing fields"
              style={{
                display:"flex", alignItems:"center", gap:5,
                padding:"6px 12px", borderRadius:10, fontSize:12, fontWeight:600,
                background:"#fffbeb", color:"#b45309",
                border:"1px solid #fde68a",
                cursor:"pointer", transition:"all .15s"
              }}
            >
              <AlertCircle size={13} />
              {missing.length}
              {showMissing ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}

          <button
            onClick={handleEditToggle}
            className={`doc-btn-edit ${isEditing ? "doc-btn-edit-active" : ""}`}
          >
            {isEditing ? <CheckCircle size={13} /> : <Pencil size={13} />}
            {isEditing ? "Save" : "Edit"}
          </button>

          <button
            onClick={copy}
            className="btn-ghost"
            style={{padding:"6px 10px",fontSize:12}}
          >
            {copied ? <CheckCircle size={13} color="#c8922a" /> : <FileText size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>

          <button
            onClick={dlPDF} disabled={pdfBusy}
            className="doc-btn-pdf"
            style={{ opacity: pdfBusy ? 0.6 : 1 }}
          >
            <FileDown size={13} />
            {pdfBusy ? "..." : "PDF"}
          </button>

          <button
            onClick={dlDocx} disabled={docxBusy}
            className="doc-btn-docx"
            style={{ opacity: docxBusy ? 0.6 : 1 }}
          >
            <Download size={13} />
            {docxBusy ? "..." : "DOCX"}
          </button>
        </div>
      </div>

      {/* ── Missing Fields Panel ── */}
      {showMissing && missing.length > 0 && (
        <div className="animate-slideDown" style={{
          background:"#fffbeb", borderBottom:"1px solid #fde68a",
          padding:"14px 20px", flexShrink:0
        }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#92400e", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
            <AlertCircle size={13} />
            Complete these fields to finalise the agreement:
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {missing.map((f, i) => (
              <span key={i} style={{
                fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:9999,
                background:"#fffef5", color:"#b45309",
                border:"1px solid #fbbf24"
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Document Canvas ── */}
      <div className="doc-canvas">
        <div className="doc-paper">
          <div
            id="deedContent"
            ref={contentRef}
            contentEditable={isEditing}
            suppressContentEditableWarning={true}
            className={`deed-wrap w-full relative z-10 p-2 transition-all ${
              isEditing ? 'outline-none ring-2 ring-amber-400 ring-offset-2 rounded-sm' : 'outline-none'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
