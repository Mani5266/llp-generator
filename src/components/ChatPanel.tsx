"use client";
import { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
import { LLPData } from "@/types";


interface Msg { role:"agent"|"user"; content:string; options?:string[]; checkboxes?:string[]; snapshot?: { data: LLPData; step: string; done: boolean }; }
interface Props {
  data:LLPData; step:string; done:boolean; pct:number; sessionId: string | null;
  onUpdates:(u:Record<string,unknown>)=>void;
  onStep:(s:string)=>void; onDone:()=>void; onRestart:()=>void;
  onRestore:(data:LLPData, step:string, done:boolean)=>void;
  onBackToDashboard?:()=>void;
}

export default function ChatPanel({data,step,done,pct,sessionId,onUpdates,onStep,onDone,onRestart,onRestore,onBackToDashboard}:Props) {
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
      const hdrs: Record<string,string> = {"Content-Type":"application/json"};
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
    <div className="chat-container">

      {/* ── Header ── */}
      <div className="chat-header">
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div className="chat-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div>
            <div className="chat-header-title">LLP Generator</div>
            <div className="chat-header-sub">LLP Agreement Assistant</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {onBackToDashboard && (
            <button className="chat-header-btn" onClick={onBackToDashboard} title="Dashboard">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </button>
          )}
          <button className="chat-header-btn" onClick={() => { if (confirm("Are you sure you want to restart? All your progress will be lost.")) onRestart(); }} title="Restart">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="chat-progress-bar">
        <div style={{display:"flex",alignItems:"center",gap:12,flex:1}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:11,fontWeight:600,color:"#6b7a8d",textTransform:"uppercase",letterSpacing:"0.5px"}}>Step {stepNum} of {totalSteps}</span>
              <span style={{fontSize:13,fontWeight:800,color:"#0c1929",fontVariantNumeric:"tabular-nums"}}>{pct}%</span>
            </div>
            <div style={{height:4,background:"#e5e9f0",borderRadius:4,overflow:"hidden",position:"relative"}} className="progress-bar">
              <div style={{height:"100%",borderRadius:4,background:pct===100?"#c8922a":"#0c1929",width:`${pct}%`,transition:"width 0.6s cubic-bezier(0.16, 1, 0.3, 1)"}}/>
            </div>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="chat-messages">
        {msgs.map((m,i)=>(
          <div key={i} className="animate-fadeIn" style={{display:"flex",gap:10,alignItems:"flex-start",flexDirection:m.role==="user"?"row-reverse":"row",marginBottom:2}}>
            {/* Agent Avatar */}
            {m.role==="agent"&&(
              <div className="chat-avatar-agent">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
            )}
            <div style={{maxWidth:"85%",display:"flex",flexDirection:"column",gap:8}}>
              {/* Message Bubble */}
              <div className={m.role==="agent" ? "chat-bubble-agent" : "chat-bubble-user"}>{m.content}</div>

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
                          borderRadius:9999,
                          background: isYes ? "#c8922a" : isNo ? "#dc2626" : "#0c1929",
                          color:"#fff",
                          cursor:"pointer",
                          fontFamily:"inherit",
                          fontWeight:600,
                          letterSpacing:"-0.2px",
                          boxShadow: isYes ? "0 2px 8px rgba(200,146,42,0.25)" : isNo ? "0 2px 8px rgba(220,38,38,0.2)" : "0 2px 8px rgba(12,25,41,0.15)"
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
                <div style={{display:"flex",flexDirection:"column",gap:10,background:"#f8f9fc",padding:"16px 18px",borderRadius:14,marginTop:4,border:"1px solid #e0e5ed"}}>
                  <div style={{fontSize:12,color:"#c8922a",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Select designated partners</div>
                  {m.checkboxes.map((cb,j)=>{
                    const label = typeof cb === "object" ? ((cb as any).label || (cb as any).value || JSON.stringify(cb)) : String(cb);
                    return (
                        <label key={j} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13.5,color:"#0c1929",padding:"6px 8px",borderRadius:10,transition:"background 0.15s ease",background:checkedItems[label]?"rgba(200,146,42,0.08)":"transparent"}}>
                        <input type="checkbox" checked={!!checkedItems[label]} onChange={e=>setCheckedItems(p=>({...p,[label]:e.target.checked}))} style={{width:18,height:18,accentColor:"#c8922a",cursor:"pointer",borderRadius:4}} />
                        <span style={{fontWeight:checkedItems[label]?600:400}}>{label}</span>
                      </label>
                    );
                  })}
                    <button
                    style={{padding:"10px 20px",fontSize:13,border:"none",borderRadius:9999,background:"#0c1929",color:"white",fontWeight:600,cursor:"pointer",marginTop:6,alignSelf:"flex-start",fontFamily:"inherit",transition:"all .2s ease",boxShadow:"0 2px 8px rgba(12,25,41,0.15)"}}
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
                <div style={{background:"#f8f9fc",border:"1px solid #e0e5ed",borderRadius:14,padding:"16px 18px",marginTop:4,display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{fontSize:12,color:"#0c1929",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>
                    {step === "contributions" ? "Capital Contribution %" : "Profit & Loss Sharing %"}
                  </div>
                  {data.partners.map((p, idx) => (
                    <div key={idx} style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0"}}>
                      <span style={{fontSize:13.5,color:"#0c1929",flex:1,fontWeight:500}}>{p.salutation} {p.fullName || `Partner ${idx+1}`}</span>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <input
                          type="number" min="0" max="100"
                          placeholder="0"
                          value={percentageInputs[idx] ?? ""}
                          onChange={e => setPercentageInputs(prev => ({...prev, [idx]: e.target.value}))}
                          style={{width:68,padding:"8px 10px",borderRadius:10,border:"1.5px solid #d4d9e3",background:"#ffffff",color:"#0c1929",fontSize:13,textAlign:"center",fontFamily:"'JetBrains Mono','Inter',monospace",fontWeight:500,outline:"none",transition:"all .2s"}}
                        />
                        <span style={{fontSize:13,color:"#9ca8b7",fontWeight:600}}>%</span>
                      </div>
                    </div>
                  ))}
                  <button
                    style={{padding:"10px 20px",fontSize:13,border:"none",borderRadius:9999,background:"#0c1929",color:"white",fontWeight:600,cursor:"pointer",marginTop:6,alignSelf:"flex-start",fontFamily:"inherit",opacity:busy?0.5:1,transition:"all .2s ease",boxShadow:"0 2px 8px rgba(12,25,41,0.15)"}}
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
                <div className="chat-avatar-user">You</div>
                {!busy && m.snapshot && (
                  <button
                    onClick={() => handleUndo(i)}
                    title="Undo to this point"
                    style={{background:"none",border:"none",color:"#9ca8b7",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:2,padding:"2px",borderRadius:4,transition:"color .15s"}}
                    onMouseOver={e=>e.currentTarget.style.color="#ef4444"}
                    onMouseOut={e=>e.currentTarget.style.color="#9ca8b7"}
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
            <div className="chat-avatar-agent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <div className="chat-typing-indicator">
              <span className="chat-typing-dot" style={{animationDelay:"0s"}}/>
              <span className="chat-typing-dot" style={{animationDelay:".2s"}}/>
              <span className="chat-typing-dot" style={{animationDelay:".4s"}}/>
            </div>
          </div>
        )}

        {/* ── Completion Banner ── */}
        {done&&(
          <div className="animate-slideUp" style={{
            background: "rgba(200,146,42,0.06)",
            border: "1px solid rgba(200,146,42,0.15)",
            borderRadius:14,
            padding:"16px 18px",
            fontSize:13.5,
            color: "#b07d1e",
            lineHeight:1.7,
            display:"flex",
            alignItems:"center",
            gap:12
          }}>
            <div style={{width:32,height:32,borderRadius:8,background:"rgba(200,146,42,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
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
      <div className="chat-input-area">
        <div className="chat-disclaimer">
           AI-generated legal content requires professional review. Edit any field directly in the document preview.
        </div>
        {done && (
          <div className="animate-slideDown" style={{
            background: "rgba(200,146,42,0.04)",
            borderBottom: "1px solid rgba(200,146,42,0.1)",
            padding:"8px 16px",fontSize:12,
            color: "#b07d1e",
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
                  <div style={{width:56,height:56,borderRadius:10,background:"#fef2f2",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"1.5px solid #ef4444",gap:2}}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                    <span style={{fontSize:8,fontWeight:800,color:"#ef4444",letterSpacing:"0.5px"}}>PDF</span>
                  </div>
                ) : (
                  <img src={f.url} alt="upload preview" style={{width:56,height:56,borderRadius:10,objectFit:"cover",border:"2px solid #c8922a"}} />
                )}
                <button style={{position:"absolute",top:-5,right:-5,width:18,height:18,borderRadius:"50%",background:"#ef4444",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,border:"1.5px solid white",cursor:"pointer",zIndex:10,fontWeight:700}} onClick={()=>setSelectedFiles(prev=>prev.filter((_,i)=>i!==idx))}>x</button>
              </div>
            ))}
          </div>
        )}

        {/* Input Row */}
        <div style={{padding:"12px 16px 16px"}}>
          <div className="chat-input-box">
            <input type="file" accept="image/*,application/pdf" multiple ref={fileInputRef} style={{display:"none"}} onChange={handleFileSelect} />
            <button
              className="chat-attach-btn"
              onClick={()=>fileInputRef.current?.click()} disabled={busy}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              value={input}
              placeholder="Type your response..."
              onChange={e=>{setInput(e.target.value);e.target.style.height="36px";e.target.style.height=Math.min(e.target.scrollHeight,100)+"px";}}
              onKeyDown={onKey} rows={1} disabled={busy}
            />
            <button
              className="chat-send-btn"
              style={{background:(busy||(!input.trim()&&selectedFiles.length===0))?"#e5e9f0":"#0c1929"}}
              onClick={()=>send(input)}
              disabled={busy||(!input.trim()&&selectedFiles.length===0)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={(busy||(!input.trim()&&selectedFiles.length===0))?"#9ca8b7":"white"} stroke="none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
