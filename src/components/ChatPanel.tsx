"use client";
import { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
import { LLPData } from "@/types";
import { useTheme } from "./ThemeProvider";
import ChatHeader from "./chat/ChatHeader";
import ProgressBar from "./chat/ProgressBar";
import ChatMessage, { Msg } from "./chat/ChatMessage";
import ChatInput from "./chat/ChatInput";
import ChatStatus from "./chat/ChatStatus";

interface Props {
  data:LLPData; step:string; done:boolean; pct:number; sessionId: string | null;
  onUpdates:(u:Record<string,unknown>)=>void;
  onStep:(s:string)=>void; onDone:()=>void; onRestart:()=>void;
  onRestore:(data:LLPData, step:string, done:boolean)=>void;
  onBackToDashboard?:()=>void;
  getAuthHeaders?:()=>Promise<Record<string,string>>;
}

export default function ChatPanel({data,step,done,pct,sessionId,onUpdates,onStep,onDone,onRestart,onRestore,onBackToDashboard,getAuthHeaders}:Props) {
  const { theme } = useTheme();
  const [msgs,setMsgs] = useState<Msg[]>([
    { role:"agent", content:"Welcome to LLP Agreement Assistant.\n\nI will guide you through creating a legally compliant LLP Partnership Deed by collecting the required details step by step.\n\nTo begin, how many partners will be part of the LLP firm?", options:["2","3","4","5","5+"] },
  ]);
  const [input,setInput] = useState("");
  const [busy,setBusy]   = useState(false);
  const [checkedItems,setCheckedItems] = useState<Record<string,boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<{file:File, base64:string, mimeType:string, url:string}[]>([]);
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
  },[busy,data,step,push,onUpdates,onStep,onDone,selectedFiles,getAuthHeaders]);

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
  };

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

  const numPartners = data.numPartners || 2;
  const stepNum = step === "num_partners" ? 1 :
    step.startsWith("partner_") ? 2 + (parseInt(step.split("_")[1]) || 0) :
    step === "designated_partners" ? numPartners + 2 :
    step === "llp_name" ? numPartners + 3 :
    step === "registered_address" ? numPartners + 4 :
    step === "contributions" ? numPartners + 5 :
    step === "profits" ? numPartners + 6 :
    step === "business_objectives" ? numPartners + 7 :
    step === "other_points" ? numPartners + 8 : numPartners + 9;
  const totalSteps = numPartners + 8;

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-chat)] text-[var(--text-primary)] font-sans transition-colors duration-350 overflow-hidden">
      <ChatHeader onRestart={onRestart} onBackToDashboard={onBackToDashboard} />
      
      <ProgressBar stepNum={stepNum} totalSteps={totalSteps} pct={pct} />

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3.5 bg-[var(--bg-chat)] transition-colors duration-350">
        {msgs.map((m, i) => (
          <ChatMessage
            key={i}
            msg={m}
            index={i}
            busy={busy}
            step={step}
            data={data}
            checkedItems={checkedItems}
            percentageInputs={percentageInputs}
            onUndo={handleUndo}
            onSend={send}
            onCheckboxChange={(label, checked) => setCheckedItems(p => ({ ...p, [label]: checked }))}
            onPercentageInputChange={(idx, val) => setPercentageInputs(p => ({ ...p, [idx]: val }))}
            onSubmitPercentages={submitPercentages}
          />
        ))}
        
        <ChatStatus busy={busy} done={done} isDark={isDark} />
        <div ref={endRef} />
      </div>

      <ChatInput
        input={input}
        busy={busy}
        done={done}
        isDark={isDark}
        selectedFiles={selectedFiles}
        setInput={setInput}
        onSend={send}
        onFileSelect={handleFileSelect}
        onRemoveFile={idx => setSelectedFiles(p => p.filter((_, i) => i !== idx))}
      />
    </div>
  );
}
