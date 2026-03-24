"use client";
import { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
import { LLPData } from "@/types";
import { useTheme } from "./ThemeProvider";

interface Msg { role:"agent"|"user"; content:string; options?:string[]; checkboxes?:string[]; snapshot?: { data: LLPData; step: string; done: boolean }; }
interface Props {
  data:LLPData; step:string; done:boolean; pct:number; sessionId: string | null;
  onUpdates:(u:Record<string,unknown>)=>void;
  onStep:(s:string)=>void; onDone:()=>void; onRestart:()=>void;
  onRestore:(data:LLPData, step:string, done:boolean)=>void;
  onBackToDashboard?:()=>void;
  getAuthHeaders?:()=>Promise<Record<string,string>>;
}

export default function ChatPanel({data,step,done,pct,sessionId,onUpdates,onStep,onDone,onRestart,onRestore,onBackToDashboard,getAuthHeaders}:Props) {
  const { theme, toggle } = useTheme();
  const [msgs,setMsgs] = useState<Msg[]>([
    { role:"agent", content:"Welcome to LLP Agreement Assistant.\n\nI will guide you through creating a legally compliant LLP Partnership Deed by collecting the required details step by step.\n\nTo begin, how many partners will be part of the LLP firm?", options:["2","3","4","5","5+"] },
  ]);
  const [input,setInput] = useState("");
  const [busy,setBusy]   = useState(false);
  const [checkedItems,setCheckedItems] = useState<Record<string,boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<{file:File, base64:string, mimeType:string, url:string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs,busy]);

  const push = useCallback((m:Msg)=>setMsgs(p=>[...p,m]),[]);
  const [percentageInputs, setPercentageInputs] = useState<Record<number, string>>({});

  const send = useCallback(async(text:string)=>{
    const msg=text.trim();
    if((!msg && selectedFiles.length === 0) || busy) return;
    setInput("");

    const maybeNum = Number(msg);
    const isCountUpdate = !isNaN(maybeNum) && maybeNum >= 2 && maybeNum <= 10 && selectedFiles.length === 0;
    if (isCountUpdate) {
      onUpdates({ numPartners: maybeNum });
    }

    const curFiles = [...selectedFiles];
    setSelectedFiles([]);
    const snapshot = { data: JSON.parse(JSON.stringify(data)), step, done };
    push({role:"user",content: curFiles.length > 0 ? `[Attached ${curFiles.length} file(s)] ${msg}` : msg, snapshot});
    setBusy(true);
    try {
      const apiData = isCountUpdate ? { ...data, numPartners: maybeNum } : data;
      const hdrs = getAuthHeaders ? await getAuthHeaders() : {"Content-Type":"application/json"};
      const payload = {
        message:msg, data: apiData, step,
        files: curFiles.length > 0 ? curFiles.map(f => ({ base64: f.base64, mimeType: f.mimeType })) : undefined
      };
      const r = await fetch("/api/chat",{method:"POST",headers:hdrs,body:JSON.stringify(payload)});
      const ai = await r.json();
      if (!r.ok) {
        push({ role:"agent", content: ai.message || "Something went wrong. Please try again." });
        return;
      }
      if (ai.updates&&Object.keys(ai.updates).length) onUpdates(ai.updates);
      if (ai.nextStep) onStep(ai.nextStep);
      if (ai.isComplete) onDone();
      push({ role:"agent", content: ai.validationError?`${ai.validationError}\n\n${ai.message}`:ai.message, options:ai.suggestedOptions?.length?ai.suggestedOptions:undefined, checkboxes:ai.suggestedCheckboxes?.length?ai.suggestedCheckboxes:undefined });
    } catch (err) { console.error("Chat send error:", err); push({role:"agent",content:"Something went wrong. Please try again."}); }
    finally { setBusy(false); }
  },[busy,data,step,push,onUpdates,onStep,onDone,selectedFiles]);

  const submitPercentages = useCallback(() => {
    const partners = data.partners || [];
    const values = partners.map((_, i) => percentageInputs[i] || "0");
    const formatted = values.join(", ");
    setPercentageInputs({});
    send(formatted);
  }, [percentageInputs, data.partners, send]);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newFiles = await Promise.all(files.map(file => {
      return new Promise<{file:File, base64:string, mimeType:string, url:string}>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          const base64 = result.split(',')[1];
          resolve({ file, base64, mimeType: file.type, url: result });
        };
        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
        reader.readAsDataURL(file);
      });
    })).catch(err => {
      console.error("File read error:", err);
      alert("Failed to read one or more files. Please try again.");
      return [] as {file:File, base64:string, mimeType:string, url:string}[];
    });
    setSelectedFiles(prev => [...prev, ...newFiles]);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const onKey=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);} };

  const handleUndo = (index: number) => {
    const m = msgs[index];
    if (!m || !m.snapshot) return;
    if (msgs.length - index > 3) {
      if (!confirm("Are you sure you want to revert back to this point? All subsequent chat history and document progress will be lost.")) return;
    }
    onRestore(m.snapshot.data, m.snapshot.step, m.snapshot.done);
    setMsgs(prev => prev.slice(0, index));
  };

  const isDark = theme === "dark";

  const stepNum = step === "num_partners" ? 1 :
    step.startsWith("partner_") ? 2 + (parseInt(step.split("_")[1]) || 0) :
    step === "designated_partners" ? data.numPartners + 2 :
    step === "llp_name" ? data.numPartners + 3 :
    step === "registered_address" ? data.numPartners + 4 :
    step === "contributions" ? data.numPartners + 5 :
    step === "profits" ? data.numPartners + 6 :
    step === "business_objectives" ? data.numPartners + 7 :
    step === "other_points" ? data.numPartners + 8 : data.numPartners + 9;
  const totalSteps = data.numPartners + 8;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"var(--bg-chat)",color:"var(--text-primary)",fontFamily:"'Inter',-apple-system,system-ui,sans-serif",transition:"background .35s ease"}}>

      {/* ── Header ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",background:"var(--bg-header)",flexShrink:0,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:40,height:40,borderRadius:12,background:"var(--accent-gradient)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(13,150,104,0.3)"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#f0f4f8",letterSpacing:"-0.3px"}}>Deed AI</div>
            <div style={{fontSize:11,color:"#64748b",fontWeight:500,marginTop:1}}>LLP Agreement Assistant</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button className="theme-toggle" onClick={toggle} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            {isDark ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          {onBackToDashboard && (
            <button className="theme-toggle" onClick={onBackToDashboard} title="Dashboard">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </button>
          )}
          <button className="theme-toggle" onClick={() => { if (confirm("Are you sure you want to restart? All your progress will be lost.")) onRestart(); }} title="Restart" style={{fontSize:15}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div style={{background:"var(--bg-secondary)",borderBottom:"1px solid var(--border-color)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,transition:"background .35s ease"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,flex:1}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:11,fontWeight:600,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Step {stepNum} of {totalSteps}</span>
              <span style={{fontSize:13,fontWeight:800,color:"var(--accent)",fontVariantNumeric:"tabular-nums"}}>{pct}%</span>
            </div>
            <div style={{height:4,background:"var(--bg-progress)",borderRadius:4,overflow:"hidden",position:"relative"}} className="progress-bar">
              <div style={{height:"100%",borderRadius:4,background:"var(--accent-gradient)",width:`${pct}%`,transition:"width 0.6s cubic-bezier(0.16, 1, 0.3, 1)"}}/>
            </div>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{flex:1,overflowY:"auto",padding:"20px 16px 16px",display:"flex",flexDirection:"column",gap:14,background:"var(--bg-chat)",transition:"background .35s ease"}}>
        {msgs.map((m,i)=>(
          <div key={i} className="animate-fadeIn" style={{display:"flex",gap:10,alignItems:"flex-start",flexDirection:m.role==="user"?"row-reverse":"row",marginBottom:2}}>
            {/* Agent Avatar */}
            {m.role==="agent"&&(
              <div style={{width:34,height:34,borderRadius:10,background:"var(--accent-gradient)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,boxShadow:"0 2px 6px rgba(13,150,104,0.2)"}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
            )}
            <div style={{maxWidth:"85%",display:"flex",flexDirection:"column",gap:8}}>
              {/* Message Bubble */}
              <div style={m.role==="agent"
                ? {padding:"14px 18px",borderRadius:"2px 16px 16px 16px",fontSize:13.5,lineHeight:1.75,whiteSpace:"pre-wrap",wordBreak:"break-word",background:"var(--bg-agent-bubble)",color:"var(--text-agent)",boxShadow:"var(--shadow-sm)",border:"1px solid var(--border-light)",transition:"all .35s ease"}
                : {padding:"12px 18px",borderRadius:"16px 2px 16px 16px",fontSize:13.5,lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word",background:"var(--bg-user-bubble)",color:"var(--text-user)",boxShadow:"var(--shadow-md)",transition:"all .35s ease"}
              }>{m.content}</div>

              {/* ── Suggested Options ── */}
              {m.options&&(
                <div style={{display:"flex",flexWrap:"wrap" as const,gap:8,marginTop:2}}>
                  {m.options.map((o,j)=>{
                    const label = typeof o === "object" ? ((o as any).label || (o as any).value || JSON.stringify(o)) : String(o);
                    const isYes = label.toLowerCase().startsWith("yes");
                    const isNo = label.toLowerCase().startsWith("no");
                    return (
                      <button
                        key={j}
                        className="suggestion-btn"
                        style={{
                          padding:"9px 22px",
                          fontSize:13,
                          border:"none",
                          borderRadius:"var(--radius-full)",
                          background: isYes ? "linear-gradient(135deg, #059669, #10b981)" : isNo ? "linear-gradient(135deg, #dc2626, #ef4444)" : "var(--accent-gradient)",
                          color:"#fff",
                          cursor:"pointer",
                          fontFamily:"inherit",
                          fontWeight:600,
                          letterSpacing:"-0.2px",
                          boxShadow: isYes ? "0 2px 8px rgba(5,150,105,0.3)" : isNo ? "0 2px 8px rgba(220,38,38,0.25)" : "0 2px 8px rgba(13,150,104,0.25)"
                        }}
                        onClick={()=>{
                          if (label === "5+") { textareaRef.current?.focus(); }
                          else { send(label); }
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Checkbox Selection ── */}
              {m.checkboxes&&(
                <div style={{display:"flex",flexDirection:"column",gap:10,background:"var(--bg-checkbox)",padding:"16px 18px",borderRadius:"var(--radius-lg)",marginTop:4,border:"1px solid var(--border-color)"}}>
                  <div style={{fontSize:12,color:"var(--accent)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Select designated partners</div>
                  {m.checkboxes.map((cb,j)=>{
                    const label = typeof cb === "object" ? ((cb as any).label || (cb as any).value || JSON.stringify(cb)) : String(cb);
                    return (
                      <label key={j} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13.5,color:"var(--text-primary)",padding:"6px 8px",borderRadius:"var(--radius-md)",transition:"background 0.15s ease",background:checkedItems[label]?"var(--accent-subtle)":"transparent"}}>
                        <input type="checkbox" checked={!!checkedItems[label]} onChange={e=>setCheckedItems(p=>({...p,[label]:e.target.checked}))} style={{width:18,height:18,accentColor:"var(--accent)",cursor:"pointer",borderRadius:4}} />
                        <span style={{fontWeight:checkedItems[label]?600:400}}>{label}</span>
                      </label>
                    );
                  })}
                  <button
                    style={{padding:"10px 20px",fontSize:13,border:"none",borderRadius:"var(--radius-full)",background:"var(--bg-header)",color:"white",fontWeight:600,cursor:"pointer",marginTop:6,alignSelf:"flex-start",fontFamily:"inherit",transition:"all .2s ease",boxShadow:"var(--shadow-sm)"}}
                    onClick={()=>{
                      const selected = Object.keys(checkedItems).filter(k=>checkedItems[k]);
                      if(selected.length===0){alert("Please select at least one option.");return;}
                      send(`The selected designated partners are: ${selected.join(", ")}`);
                      setCheckedItems({});
                    }}
                  >
                    Confirm Selection
                  </button>
                </div>
              )}

              {/* ── Percentage Input Widget ── */}
              {m.role === "agent" && i === msgs.length - 1 && !busy && (step === "contributions" || step === "profits") && (
                <div style={{background:"var(--bg-checkbox)",border:"1px solid var(--border-color)",borderRadius:"var(--radius-lg)",padding:"16px 18px",marginTop:4,display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{fontSize:12,color:"var(--accent)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>
                    {step === "contributions" ? "Capital Contribution %" : "Profit & Loss Sharing %"}
                  </div>
                  {data.partners.map((p, idx) => (
                    <div key={idx} style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0"}}>
                      <span style={{fontSize:13.5,color:"var(--text-primary)",flex:1,fontWeight:500}}>{p.salutation} {p.fullName || `Partner ${idx+1}`}</span>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <input
                          type="number" min="0" max="100"
                          placeholder="0"
                          value={percentageInputs[idx] ?? ""}
                          onChange={e => setPercentageInputs(prev => ({...prev, [idx]: e.target.value}))}
                          style={{width:68,padding:"8px 10px",borderRadius:"var(--radius-md)",border:"1.5px solid var(--border-input)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,textAlign:"center",fontFamily:"'JetBrains Mono','Inter',monospace",fontWeight:500,outline:"none",transition:"all .2s"}}
                        />
                        <span style={{fontSize:13,color:"var(--text-faint)",fontWeight:600}}>%</span>
                      </div>
                    </div>
                  ))}
                  <button
                    style={{padding:"10px 20px",fontSize:13,border:"none",borderRadius:"var(--radius-full)",background:"var(--accent-gradient)",color:"white",fontWeight:600,cursor:"pointer",marginTop:6,alignSelf:"flex-start",fontFamily:"inherit",opacity:busy?0.5:1,transition:"all .2s ease",boxShadow:"0 2px 8px rgba(13,150,104,0.2)"}}
                    disabled={busy}
                    onClick={submitPercentages}
                  >
                    Submit
                  </button>
                </div>
              )}
            </div>

            {/* User Avatar */}
            {m.role==="user"&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,marginTop:2}}>
                <div style={{width:34,height:34,borderRadius:10,background:"var(--bg-header)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,fontWeight:700,color:"#f0f4f8",border:"2px solid rgba(255,255,255,0.08)"}}>You</div>
                {!busy && m.snapshot && (
                  <button
                    onClick={() => handleUndo(i)}
                    title="Undo to this point"
                    style={{background:"none",border:"none",color:"var(--text-faint)",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:2,padding:"2px",borderRadius:4,transition:"color .15s"}}
                    onMouseOver={e=>e.currentTarget.style.color="#ef4444"}
                    onMouseOut={e=>e.currentTarget.style.color="var(--text-faint)"}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3v7.7"/></svg>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* ── Typing Indicator ── */}
        {busy&&(
          <div className="animate-fadeIn" style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:34,height:34,borderRadius:10,background:"var(--accent-gradient)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 2px 6px rgba(13,150,104,0.2)"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <div style={{padding:"14px 20px",borderRadius:"2px 16px 16px 16px",background:"var(--bg-agent-bubble)",border:"1px solid var(--border-light)",boxShadow:"var(--shadow-sm)",display:"flex",gap:5,alignItems:"center"}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:"var(--accent)",display:"inline-block",animation:"blink 1.2s infinite"}}/>
              <span style={{width:7,height:7,borderRadius:"50%",background:"var(--accent)",display:"inline-block",animation:"blink 1.2s infinite",animationDelay:".2s"}}/>
              <span style={{width:7,height:7,borderRadius:"50%",background:"var(--accent)",display:"inline-block",animation:"blink 1.2s infinite",animationDelay:".4s"}}/>
            </div>
          </div>
        )}

        {/* ── Completion Banner ── */}
        {done&&(
          <div className="animate-slideUp" style={{
            background: isDark ? "rgba(5,150,105,0.1)" : "rgba(5,150,105,0.06)",
            border: `1px solid ${isDark ? "rgba(16,185,129,0.2)" : "rgba(5,150,105,0.15)"}`,
            borderRadius:"var(--radius-lg)",
            padding:"16px 18px",
            fontSize:13.5,
            color: isDark ? "#34d399" : "#047857",
            lineHeight:1.7,
            display:"flex",
            alignItems:"center",
            gap:12
          }}>
            <div style={{width:32,height:32,borderRadius:8,background:isDark?"rgba(16,185,129,0.15)":"rgba(5,150,105,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <strong style={{fontWeight:700}}>Agreement Complete</strong>
              <div style={{fontSize:12,opacity:0.8,marginTop:2}}>Download your document using the buttons in the preview panel.</div>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* ── Input Area ── */}
      <div style={{display:"flex",flexDirection:"column",background:"var(--bg-secondary)",borderTop:"1px solid var(--border-color)",flexShrink:0,transition:"background .35s ease"}}>
        <div style={{padding:"6px 16px",fontSize:10.5,color:"var(--text-faint)",textAlign:"center",lineHeight:1.5,borderBottom:"1px solid var(--border-light)"}}>
           AI-generated legal content requires professional review. Edit any field directly in the document preview.
        </div>
        {done && (
          <div className="animate-slideDown" style={{
            background: isDark ? "rgba(5,150,105,0.08)" : "rgba(5,150,105,0.04)",
            borderBottom: `1px solid ${isDark ? "rgba(16,185,129,0.15)" : "rgba(5,150,105,0.1)"}`,
            padding:"8px 16px",fontSize:12,
            color: isDark ? "#34d399" : "#047857",
            fontWeight:500,textAlign:"center"
          }}>
            Draft complete. You can still ask questions or make adjustments.
          </div>
        )}

        {/* File Previews */}
        {selectedFiles.length > 0 && (
          <div style={{padding:"12px 18px 0",display:"flex",gap:10,overflowX:"auto"}}>
            {selectedFiles.map((f, idx) => (
              <div key={idx} style={{position:"relative",display:"inline-block",flexShrink:0}}>
                {f.mimeType === "application/pdf" ? (
                  <div style={{width:56,height:56,borderRadius:"var(--radius-md)",background:isDark?"#1a0505":"#fef2f2",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"1.5px solid #ef4444",gap:2}}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                    <span style={{fontSize:8,fontWeight:800,color:"#ef4444",letterSpacing:"0.5px"}}>PDF</span>
                  </div>
                ) : (
                  <img src={f.url} alt="upload preview" style={{width:56,height:56,borderRadius:"var(--radius-md)",objectFit:"cover",border:"2px solid var(--accent)"}} />
                )}
                <button style={{position:"absolute",top:-5,right:-5,width:18,height:18,borderRadius:"50%",background:"#ef4444",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,border:"1.5px solid white",cursor:"pointer",zIndex:10,fontWeight:700}} onClick={()=>setSelectedFiles(prev=>prev.filter((_,i)=>i!==idx))}>x</button>
              </div>
            ))}
          </div>
        )}

        {/* Input Row */}
        <div style={{padding:"12px 16px 16px"}}>
          <div style={{display:"flex",gap:8,alignItems:"flex-end",background:"var(--bg-input)",borderRadius:"var(--radius-xl)",border:"1.5px solid var(--border-input)",padding:"6px 8px",transition:"all .2s ease"}}>
            <input type="file" accept="image/*,application/pdf" multiple ref={fileInputRef} style={{display:"none"}} onChange={handleFileSelect} />
            <button
              style={{width:36,height:36,borderRadius:"var(--radius-md)",background:"transparent",color:"var(--text-faint)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}
              onClick={()=>fileInputRef.current?.click()} disabled={busy}
              onMouseOver={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "var(--accent-subtle)"; }}
              onMouseOut={e => { e.currentTarget.style.color = "var(--text-faint)"; e.currentTarget.style.background = "transparent"; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <textarea
              ref={textareaRef}
              style={{flex:1,padding:"8px 6px",fontSize:13.5,border:"none",borderRadius:8,background:"transparent",color:"var(--text-primary)",fontFamily:"'Inter',-apple-system,system-ui,sans-serif",outline:"none",resize:"none",minHeight:36,maxHeight:100,lineHeight:1.5,width:"100%"}}
              value={input}
              placeholder="Type your response..."
              onChange={e=>{setInput(e.target.value);e.target.style.height="36px";e.target.style.height=Math.min(e.target.scrollHeight,100)+"px";}}
              onKeyDown={onKey} rows={1} disabled={busy}
            />
            <button
              style={{width:36,height:36,borderRadius:"var(--radius-md)",background:(busy||(!input.trim()&&selectedFiles.length===0))?"var(--bg-progress)":"var(--accent-gradient)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s ease",boxShadow:(busy||(!input.trim()&&selectedFiles.length===0))?"none":"0 2px 6px rgba(13,150,104,0.25)"}}
              onClick={()=>send(input)}
              disabled={busy||(!input.trim()&&selectedFiles.length===0)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={busy||(!input.trim()&&selectedFiles.length===0)?"var(--text-faint)":"white"} stroke="none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
