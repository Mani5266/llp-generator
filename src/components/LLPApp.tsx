"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { LLPData, defaultData, blankPartner, getPct, getMissing } from "@/types";
import ChatPanel from "./ChatPanel";
import DocumentPanel from "./DocumentPanel";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";

function setPath(obj: Record<string,unknown>, path: string, val: unknown) {
  const parts = path.replace(/\[(\w+)\]/g, ".$1").split(".");
  let cur: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const nextK = parts[i + 1];
    if (cur[k] == null || typeof cur[k] !== "object") {
      cur[k] = /^\d+$/.test(nextK) ? [] : {};
    }
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = val;
}

export default function LLPApp() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData]     = useState<LLPData>(defaultData());
  const [step, setStep]     = useState("num_partners");
  const [done, setDone]     = useState(false);
  const [html, setHtml]     = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const isInitialMount = useRef(true);
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      setSessionId(id);
      supabase.from("agreements").select("*").eq("id", id).eq("user_id", user.id).single().then(({ data: dbData, error }) => {
        if (!error && dbData && dbData.data && Object.keys(dbData.data).length > 0) {
          setData(dbData.data as LLPData);
          setStep(dbData.step);
          setDone(dbData.is_done);
        } else if (error) {
          supabase.from("agreements").select("*").eq("id", id).single().then(({ data: fallbackData, error: fallbackError }) => {
            if (!fallbackError && fallbackData && fallbackData.data && Object.keys(fallbackData.data).length > 0) {
              setData(fallbackData.data as LLPData);
              setStep(fallbackData.step);
              setDone(fallbackData.is_done);
            } else {
              router.replace("/dashboard");
            }
          });
        }
      });
    } else {
      supabase.from("agreements").insert([{ data: defaultData(), step: "num_partners", is_done: false, user_id: user.id }]).select().single().then(({ data: dbData, error }) => {
        if (!error && dbData) {
          setSessionId(dbData.id);
          window.history.replaceState({}, "", `?id=${dbData.id}`);
        }
      });
    }
  }, [user, router]);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (!sessionId) return;
    const saveTimer = setTimeout(() => {
      supabase.from("agreements").update({
        data, step, is_done: done, updated_at: new Date().toISOString()
      }).eq("id", sessionId).then();
    }, 1000);
    return () => clearTimeout(saveTimer);
  }, [data, step, done, sessionId]);

  useEffect(()=>{
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async()=>{
      try {
        const r = await fetch("/api/render-deed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
        if (r.ok) { const j = await r.json(); setHtml(j.html); }
      } catch {}
    }, 400);
    return ()=>{ if(timer.current) clearTimeout(timer.current); };
  }, [data]);

  const applyUpdates = useCallback((updates: Record<string,unknown>)=>{
    setData(prev=>{
      const next = JSON.parse(JSON.stringify(prev)) as LLPData & Record<string,unknown>;
      for (const [k,v] of Object.entries(updates)) setPath(next,k,v);
      if (next.registeredAddress?.district) next.executionCity = next.registeredAddress.district;
      const n = Number(next.numPartners)||2;
      while (next.partners.length<n) {
        const i = next.partners.length;
        next.partners.push(blankPartner(i));
        next.contributions.push({partnerIndex:i,percentage:0,amount:0});
        next.profits.push({partnerIndex:i,percentage:0});
      }
      if (next.totalCapital>0)
        next.contributions = next.contributions.map(c=>({...c,amount:Math.round(next.totalCapital*(c.percentage||0)/100)}));
      return next as LLPData;
    });
  },[]);

  const dlDocx = async()=>{
    const r = await fetch("/api/download-docx",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
    if (!r.ok){alert("Download failed");return;}
    const blob = await r.blob();
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`LLP_Agreement_${(data.llpName||"draft").replace(/\s+/g,"_")}.docx`; a.click();
  };

  const dlPDF = async()=>{
    const el = document.getElementById("deedContent");
    const rawHtml = el ? el.innerHTML : html;
    const r = await fetch("/api/download-pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ html: rawHtml, llpName: data.llpName })});
    if (!r.ok){alert("Failed");return;}
    const blob = new Blob([await r.text()],{type:"text/html"});
    window.open(URL.createObjectURL(blob),"_blank");
  };

  const restart=()=>{ setData(defaultData()); setStep("num_partners"); setDone(false); setHtml(""); };

  return (
    <div className="mobile-stack" style={{display:"grid",gridTemplateColumns:"420px 1fr",height:"100vh",overflow:"hidden"}}>
      <div style={{display: mobileTab === "chat" ? "flex" : "none", flexDirection:"column", height:"100%"}}
           className={typeof window !== "undefined" && window.innerWidth <= 768 ? "" : ""}
           id="chat-section">
        <ChatPanel data={data} step={step} done={done} pct={getPct(data)}
          onUpdates={applyUpdates} onStep={setStep} onDone={()=>setDone(true)} onRestart={restart}
          onRestore={(d, s, dn) => { setData(d); setStep(s); setDone(dn); }}
          onBackToDashboard={() => router.push("/dashboard")} />
      </div>
      <div style={{display: mobileTab === "preview" ? "flex" : undefined, flexDirection:"column", height:"100%"}}
           className={mobileTab !== "preview" ? "mobile-hide" : ""}
           id="preview-section">
        <DocumentPanel html={html} pct={getPct(data)} missing={getMissing(data)} onDocx={dlDocx} onPDF={dlPDF}/>
      </div>

      {/* Mobile Tab Bar */}
      <div className="mobile-tab-bar" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50}}>
        <button
          className="mobile-tab"
          onClick={() => setMobileTab("chat")}
          style={{
            background: mobileTab === "chat" ? "var(--accent)" : "var(--bg-header)",
            color: mobileTab === "chat" ? "#fff" : "var(--text-faint)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat
        </button>
        <button
          className="mobile-tab"
          onClick={() => setMobileTab("preview")}
          style={{
            background: mobileTab === "preview" ? "var(--accent)" : "var(--bg-header)",
            color: mobileTab === "preview" ? "#fff" : "var(--text-faint)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Preview
        </button>
      </div>
    </div>
  );
}
