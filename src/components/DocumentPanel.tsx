"use client";
import { useState, useEffect, useRef } from "react";
import { FileText, Download, FileDown, CheckCircle, Pencil, PencilOff, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

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
      contentRef.current.innerHTML = html || `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:500px;color:var(--text-faint);gap:16px;font-family:'Inter','Segoe UI',system-ui,sans-serif">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.35"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <p style="text-align:center;line-height:1.7;font-size:14px">Start answering questions in the chat.<br/>Your <strong>Partnership Deed</strong> will appear here live.</p>
        </div>
      `;
    }
  }, [html, isEditing]);

  const dlDocx = async () => { setDocxBusy(true); try { await onDocx(); } finally { setDocxBusy(false); } };
  const dlPDF  = async () => { setPdfBusy(true);  try { await onPDF();  } finally { setPdfBusy(false);  } };

  const handleEditToggle = () => {
    if (isEditing && onSaveHtml && contentRef.current) {
      onSaveHtml(contentRef.current.innerHTML);
    }
    setIsEditing(!isEditing);
  };

  const copy = () => {
    const el = document.getElementById("deedContent");
    if (!el) return;
    navigator.clipboard.writeText(el.innerText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"var(--bg-tertiary)", overflow:"hidden", borderLeft:"1px solid var(--border-color)", transition:"background .3s ease" }}>

      {/* ── Top Header Bar ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", background:"var(--bg-secondary)", borderBottom:"1px solid var(--border-color)", flexShrink:0, gap:12, transition:"background .3s ease", flexWrap:"wrap" }}>
        
        {/* Left: title */}
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:"var(--bg-header)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <FileText size={16} color="white" />
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--text-primary)", letterSpacing:"-0.3px", whiteSpace:"nowrap" }}>Document Preview {isManual && <span style={{color:"#f59e0b", fontSize:10, fontWeight:600}}>(Manual Mode)</span>}</div>
            <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:1 }}>{isManual ? "Using your manual edits" : "Live LLP Agreement Draft"}</div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, flexWrap:"wrap" }}>
          
          {isManual && !isEditing && onResetHtml && (
             <button
              onClick={onResetHtml}
              title="Revert to auto-generated version"
              style={{
                display:"flex", alignItems:"center", gap:6, padding:"6px 11px",
                fontSize:12, fontWeight:600, borderRadius:8, cursor:"pointer", transition:"all .15s",
                background:"transparent", color:"var(--text-faint)", border:"1px dashed var(--border-color)",
              }}
            >
              Reset to Auto
            </button>
          )}

          {missing.length > 0 && (
            <button
              onClick={() => setShowMissing(v => !v)}
              title="Show missing fields"
              style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:600,
                background:"#fff7ed", color:"#c2410c", border:"1px solid #fed7aa",
                cursor:"pointer", transition:"all .15s"
              }}
            >
              <AlertCircle size={14} />
              {missing.length} missing
              {showMissing ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}

          <button
            onClick={handleEditToggle}
            style={{
              display:"flex", alignItems:"center", gap:6, padding:"6px 11px",
              fontSize:12, fontWeight:600, borderRadius:8, cursor:"pointer", transition:"all .15s",
              background: isEditing ? "#10b981" : "var(--bg-input)",
              color: isEditing ? "white" : "var(--text-secondary)",
              border: `1px solid ${isEditing ? "#059669" : "var(--border-color)"}`,
              animation: isEditing ? "pulse 2s infinite" : "none"
            }}
          >
            {isEditing ? <CheckCircle size={13} /> : <Pencil size={13} />}
            {isEditing ? "Save Changes" : "Edit"}
          </button>

          <button
            onClick={copy}
            style={{
              display:"flex", alignItems:"center", gap:6, padding:"6px 11px",
              fontSize:12, fontWeight:600, borderRadius:8, cursor:"pointer", transition:"all .15s",
              background:"var(--bg-input)", color:"var(--text-secondary)", border:"1px solid var(--border-color)"
            }}
          >
            {copied ? <CheckCircle size={13} color="#16a34a" /> : <FileText size={13} />}
            {copied ? "Copied!" : "Copy"}
          </button>

          <button
            onClick={dlPDF} disabled={pdfBusy}
            style={{
              display:"flex", alignItems:"center", gap:6, padding:"6px 12px",
              fontSize:12, fontWeight:600, borderRadius:8, cursor:"pointer",
              background:"#ef4444", color:"white", border:"none", opacity: pdfBusy ? 0.6 : 1,
              transition:"all .15s"
            }}
          >
            <FileDown size={14} />
            {pdfBusy ? "Saving…" : "PDF"}
          </button>

          <button
            onClick={dlDocx} disabled={docxBusy}
            style={{
              display:"flex", alignItems:"center", gap:6, padding:"6px 12px",
              fontSize:12, fontWeight:600, borderRadius:8, cursor:"pointer",
              background:"var(--bg-header)", color:"white", border:"none", opacity: docxBusy ? 0.6 : 1,
              transition:"all .15s"
            }}
          >
            <Download size={14} />
            {docxBusy ? "Saving…" : "DOCX"}
          </button>
        </div>
      </div>

      {/* ── Missing Fields Dropdown Panel ── */}
      {showMissing && missing.length > 0 && (
        <div className="animate-fadeIn" style={{
          background:"#fff7ed", borderBottom:"1px solid #fed7aa",
          padding:"12px 20px", flexShrink:0
        }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#9a3412", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
            <AlertCircle size={13} />
            Complete these fields in the chat to finalise your agreement:
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {missing.map((f, i) => (
              <span key={i} style={{
                fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20,
                background:"#fff", color:"#c2410c", border:"1px solid #fdba74"
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Document Canvas ── */}
      <div style={{ flex:1, background:"var(--doc-canvas)", padding:"28px 32px", display:"flex", flexDirection:"column", alignItems:"center", overflowY:"auto", transition:"background .3s ease" }}>
        <div style={{
          width:"100%", maxWidth:820, background:"var(--doc-paper)",
          boxShadow:"var(--shadow-lg)", borderRadius:4,
          minHeight:600, overflow:"auto",
          border:"1px solid var(--doc-border)",
          transition:"background .3s ease, border-color .3s ease"
        }}>
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
