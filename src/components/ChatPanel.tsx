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
}

export default function ChatPanel({data,step,done,pct,sessionId,onUpdates,onStep,onDone,onRestart,onRestore,onBackToDashboard}:Props) {
  const { theme, toggle } = useTheme();
  const [msgs,setMsgs] = useState<Msg[]>([
    { role:"agent", content:"✨ Welcome to Deed AI Assistant!\n\nI am your AI legal assistant. I will craft a perfect LLP Agreement for you by asking a few conversational questions.\n\nHow many partners will be part of the LLP firm in total?", options:["2","3","4","5","5+"] },
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

  const send = useCallback(async(text:string)=>{
    const msg=text.trim(); 
    if((!msg && selectedFiles.length === 0) || busy) return;
    setInput(""); 
    
    // INSTANT UPDATE: If msg is a number (2-10), update state immediately for snappy UI
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
      // Use updated data for API payload if count changed
      const apiData = isCountUpdate ? { ...data, numPartners: maybeNum } : data;
      const payload = {
        message:msg, data: apiData, step,
        files: curFiles.length > 0 ? curFiles.map(f => ({ base64: f.base64, mimeType: f.mimeType })) : undefined
      };
      const r = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const ai = await r.json();
      if (ai.updates&&Object.keys(ai.updates).length) onUpdates(ai.updates);
      if (ai.nextStep) onStep(ai.nextStep);
      if (ai.isComplete) onDone();
      push({ role:"agent", content: ai.validationError?`⚠️ ${ai.validationError}\n\n${ai.message}`:ai.message, options:ai.suggestedOptions?.length?ai.suggestedOptions:undefined, checkboxes:ai.suggestedCheckboxes?.length?ai.suggestedCheckboxes:undefined });
    } catch { push({role:"agent",content:"Something went wrong. Please try again."}); }
    finally { setBusy(false); }
  },[busy,data,step,push,onUpdates,onStep,onDone,selectedFiles]);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = await Promise.all(files.map(file => {
      return new Promise<{file:File, base64:string, mimeType:string, url:string}>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          const base64 = result.split(',')[1];
          resolve({ file, base64, mimeType: file.type, url: result });
        };
        reader.readAsDataURL(file);
      });
    }));

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

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"var(--bg-chat)",color:"var(--text-primary)",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",transition:"background .3s ease"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:"1px solid var(--border-color)",background:"var(--bg-header)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:38,height:38,borderRadius:10,background:"var(--accent-gradient)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#ffffff",letterSpacing:"-0.3px"}}>Deed AI Assistant</div>
            <div style={{fontSize:10,color:"#94a3b8",marginTop:1, fontFamily:"monospace"}}>ID: {sessionId?.slice(0,8) || "..."}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {/* Theme Toggle */}
          <button className="theme-toggle" onClick={toggle} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          {onBackToDashboard && <button className="theme-toggle" onClick={onBackToDashboard} title="Dashboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </button>}
          <button className="theme-toggle" onClick={onRestart} title="Restart">↺</button>
        </div>
      </div>

      {/* Progress */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px 4px",flexShrink:0,background:"var(--bg-secondary)",borderBottom:"1px solid var(--border-color)",transition:"background .3s ease"}}>
        <div style={{display:"flex",flexDirection:"column"}}>
          <span style={{fontSize:11,color:"var(--text-muted)",fontWeight:500}}>Drafting in progress...</span>
          <span style={{fontSize:10,color:"var(--accent)",fontWeight:600}}>Step {
            step === "num_partners" ? 1 :
            step.startsWith("partner_") ? 2 + parseInt(step.split("_")[1] || "0") :
            step === "partner_summary" ? data.numPartners + 2 :
            step === "designated_partners" ? data.numPartners + 3 :
            step === "llp_name" ? data.numPartners + 4 :
            step === "registered_address" ? data.numPartners + 5 :
            step === "contributions" ? data.numPartners + 6 :
            step === "profits" ? data.numPartners + 7 :
            step === "governance" ? data.numPartners + 8 :
            step === "remuneration" ? data.numPartners + 9 :
            step === "loans" ? data.numPartners + 10 :
            step === "arbitration" ? data.numPartners + 11 :
            step === "business_objectives" ? data.numPartners + 12 :
            step === "other_points" ? data.numPartners + 13 : data.numPartners + 14
          } of {data.numPartners + 14}</span>
        </div>
        <span style={{fontSize:14,color:"var(--accent)",fontWeight:700}}>{pct}%</span>
      </div>
      <div style={{height:3,background:"var(--bg-progress)",margin:0,flexShrink:0}}>
        <div style={{height:3,background:"var(--accent)",width:`${pct}%`,transition:"width .5s ease"}}/>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 14px 12px",display:"flex",flexDirection:"column",gap:10,background:"var(--bg-chat)",transition:"background .3s ease"}}>
        {msgs.map((m,i)=>(
          <div key={i} className="animate-fadeIn" style={{display:"flex",gap:8,alignItems:"flex-start",flexDirection:m.role==="user"?"row-reverse":"row",marginBottom:4}}>
            {m.role==="agent"&&<div style={{width:30,height:30,borderRadius:"50%",background:"var(--bg-header)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:4}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
            </div>}
            <div style={{maxWidth:"88%",display:"flex",flexDirection:"column",gap:6}}>
              <div style={m.role==="agent"
                ? {padding:"13px 16px",borderRadius:16,borderTopLeftRadius:4,fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word",background:"var(--bg-agent-bubble)",color:"var(--text-agent)",boxShadow:"var(--shadow-sm)",border:"1px solid var(--border-light)",transition:"background .3s ease"}
                : {padding:"11px 15px",borderRadius:16,borderTopRightRadius:4,fontSize:14,lineHeight:1.65,whiteSpace:"pre-wrap",wordBreak:"break-word",background:"var(--bg-user-bubble)",color:"var(--text-user)",transition:"background .3s ease"}
              }>{m.content}</div>
              {m.options&&(
                <div style={{display:"flex",flexWrap:"wrap" as const,gap:6}}>
                  {m.options.map((o,j)=>{
                    const label = typeof o === "object" ? ((o as any).label || (o as any).value || JSON.stringify(o)) : String(o);
                    return (
                      <button 
                        key={j} 
                        className="suggestion-btn"
                        style={{
                          padding:"8px 20px",
                          fontSize:13,
                          border:"none",
                          borderRadius:24,
                          background: label.toLowerCase().startsWith("yes") ? "#16a34a" : (label.toLowerCase().startsWith("no") ? "#dc2626" : "var(--accent)"), 
                          color:"#fff",
                          cursor:"pointer",
                          fontFamily:"inherit",
                          fontWeight:600,
                          transition:"all .2s ease",
                          boxShadow:"0 2px 6px rgba(0,0,0,0.15)"
                        }} 
                        onClick={()=>{
                          if (label === "5+") {
                            textareaRef.current?.focus();
                          } else {
                            send(label);
                          }
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
              {m.checkboxes&&(
                <div style={{display:"flex",flexDirection:"column",gap:8,background:"var(--bg-checkbox)",padding:12,borderRadius:12,marginTop:4,border:"1px solid var(--border-color)"}}>
                  <div style={{fontSize:12,color:"var(--accent)",marginBottom:4}}>Select all that apply:</div>
                  {m.checkboxes.map((cb,j)=>{
                    const label = typeof cb === "object" ? ((cb as any).label || (cb as any).value || JSON.stringify(cb)) : String(cb);
                    return (
                      <label key={j} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"var(--text-primary)"}}>
                        <input type="checkbox" checked={!!checkedItems[label]} onChange={e=>setCheckedItems(p=>({...p,[label]:e.target.checked}))} style={{width:16,height:16,accentColor:"var(--accent)",cursor:"pointer"}} />
                        {label}
                      </label>
                    );
                  })}
                  <button 
                    style={{padding:"8px 16px",fontSize:13,border:"none",borderRadius:24,background:"var(--bg-header)",color:"white",fontWeight:600,cursor:"pointer",marginTop:8,alignSelf:"flex-start",fontFamily:"inherit"}} 
                    onClick={()=>{
                      const selected = Object.keys(checkedItems).filter(k=>checkedItems[k]);
                      if(selected.length===0){alert("Please select at least one option.");return;}
                      send(`The selected designated partners are: ${selected.join(", ")}`);
                      setCheckedItems({});
                    }}
                  >
                    Submit Selection
                  </button>
                </div>
              )}
            </div>
            {m.role==="user"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,marginTop:4}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,fontWeight:700,color:"#fff"}}>U</div>
              {!busy && m.snapshot && (
                <button 
                  onClick={() => handleUndo(i)} 
                  title="Undo to this point"
                  style={{background:"none",border:"none",color:"var(--text-faint)",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:2,padding:"2px",borderRadius:4}}
                  onMouseOver={e=>e.currentTarget.style.color="#ef4444"}
                  onMouseOut={e=>e.currentTarget.style.color="var(--text-faint)"}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3v7.7"/></svg>
                </button>
              )}
            </div>}
          </div>
        ))}
        {busy&&(
          <div className="animate-fadeIn" style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:"var(--bg-header)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
            </div>
            <div style={{padding:"13px 16px",borderRadius:16,borderTopLeftRadius:4,background:"var(--bg-agent-bubble)",border:"1px solid var(--border-light)"}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:"var(--text-faint)",display:"inline-block",margin:"0 2px",animation:"blink .9s infinite"}}/>
              <span style={{width:7,height:7,borderRadius:"50%",background:"var(--text-faint)",display:"inline-block",margin:"0 2px",animation:"blink .9s infinite",animationDelay:".2s"}}/>
              <span style={{width:7,height:7,borderRadius:"50%",background:"var(--text-faint)",display:"inline-block",margin:"0 2px",animation:"blink .9s infinite",animationDelay:".4s"}}/>
            </div>
          </div>
        )}
        {done&&<div className="animate-slideUp" style={{background:isDark?"#0d2818":"#f0fdf6",border:isDark?"1px solid #1a6b3c":"1px solid #86efac",borderRadius:12,padding:"14px",fontSize:13,color:isDark?"#2dd4a0":"#166534",lineHeight:1.6}}>✅ Your LLP Agreement is complete! Download it using the buttons at the top right.</div>}
        <div ref={endRef}/>
      </div>

      {/* Input area remains even after done for history review/questions */}
      <div style={{display:"flex",flexDirection:"column",background:"var(--bg-secondary)",borderTop:"1px solid var(--border-color)",flexShrink:0,transition:"background .3s ease"}}>
        {done && <div className="animate-slideUp" style={{background:isDark?"#0d2818":"#f0fdf6",borderBottom:isDark?"1px solid #1a6b3c":"1px solid #86efac",padding:"10px 14px",fontSize:12,color:isDark?"#2dd4a0":"#166534"}}>✅ Draft 100% complete. You can still ask questions here.</div>}
          {selectedFiles.length > 0 && (
            <div style={{padding:"12px 16px 0",display:"flex",gap:8,overflowX:"auto"}}>
              {selectedFiles.map((f, idx) => (
                <div key={idx} style={{position:"relative",display:"inline-block",flexShrink:0}}>
                  {f.mimeType === "application/pdf" ? (
                    <div style={{width:60,height:60,borderRadius:8,background:"#fee2e2",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"2px solid #ef4444",gap:2}}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                      <span style={{fontSize:9,fontWeight:700,color:"#ef4444"}}>PDF</span>
                    </div>
                  ) : (
                    <img src={f.url} alt="upload preview" style={{width:60,height:60,borderRadius:8,objectFit:"cover",border:"2px solid var(--accent)"}} />
                  )}
                  <button style={{position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",background:"#ef4444",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,border:"none",cursor:"pointer",zIndex:10}} onClick={()=>setSelectedFiles(prev=>prev.filter((_,i)=>i!==idx))}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{padding:"10px 14px"}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <input type="file" accept="image/*,application/pdf" multiple ref={fileInputRef} style={{display:"none"}} onChange={handleFileSelect} />
              <button style={{width:38,height:38,borderRadius:"50%",background:"transparent",color:"var(--text-muted)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onClick={()=>fileInputRef.current?.click()} disabled={busy}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              </button>
              <textarea 
                ref={textareaRef}
                style={{flex:1,padding:"10px 14px",fontSize:13,border:"1.5px solid var(--border-input)",borderRadius:24,background:"var(--bg-input)",color:"var(--text-primary)",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",outline:"none",resize:"none",minHeight:40,maxHeight:100,lineHeight:1.5,width:"100%",transition:"background .3s ease, border-color .3s ease"}} value={input} placeholder="Type or upload Aadhaar..."
                onChange={e=>{setInput(e.target.value);e.target.style.height="40px";e.target.style.height=Math.min(e.target.scrollHeight,100)+"px";}}
                onKeyDown={onKey} rows={1} disabled={busy}/>
              <button style={{width:38,height:38,borderRadius:"50%",background:"var(--accent)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:(busy||(!input.trim()&&selectedFiles.length===0))?0.5:1,transition:"opacity .2s"}} onClick={()=>send(input)} disabled={busy||(!input.trim()&&selectedFiles.length===0)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
    </div>
  );
}
