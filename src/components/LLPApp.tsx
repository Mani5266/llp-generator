"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { LLPData, defaultData, blankPartner, getPct, getMissing, toTitleCase, calculateAge, isSelfParenting } from "@/types";
import { renderDeed } from "@/lib/deed-template";
import ChatPanel from "./ChatPanel";
import DocumentPanel from "./DocumentPanel";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";

/** Helper to build auth headers from the current Supabase session */
async function authHeaders(): Promise<Record<string,string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
}

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
        } else {
          // No matching agreement found for this user — redirect to dashboard
          router.replace("/dashboard");
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
    if (!sessionId || !user) return;
    const saveTimer = setTimeout(() => {
      supabase.from("agreements").update({
        data, step, is_done: done, updated_at: new Date().toISOString()
      }).eq("id", sessionId).eq("user_id", user.id).then(({ error }) => {
        if (error) console.error("Auto-save failed:", error.message);
      });
    }, 1000);
    return () => clearTimeout(saveTimer);
  }, [data, step, done, sessionId]);

  useEffect(()=>{
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(()=>{
      try {
        setHtml(renderDeed(data, "preview"));
      } catch (err) { console.error("Render deed error:", err); }
    }, 100);
    return ()=>{ if(timer.current) clearTimeout(timer.current); };
  }, [data]);

  const applyUpdates = useCallback((updates: Record<string,unknown>)=>{
    setData(prev=>{
      const next = JSON.parse(JSON.stringify(prev)) as LLPData & Record<string,unknown>;
      for (const [k,v] of Object.entries(updates)) setPath(next,k,v);
      // Auto-calculate age from DOB for each partner
      next.partners.forEach((p) => {
        if (p.dob) {
          const computed = calculateAge(p.dob);
          if (computed) p.age = computed;
        }
        // Clear hallucinated father names (name too similar to partner's own name)
        if (p.fullName && p.fatherName && isSelfParenting(p.fullName, p.fatherName)) {
          p.fatherName = "";
        }
      });
      if (next.llpName) next.llpName = toTitleCase(String(next.llpName));
      if (next.registeredAddress?.district) {
        next.executionCity = next.registeredAddress.district;
        if (!next.arbitrationCity) next.arbitrationCity = next.registeredAddress.district;
      }
      const n = Number(next.numPartners)||2;
      if (next.partners.length < n) {
        while (next.partners.length < n) {
          const i = next.partners.length;
          next.partners.push(blankPartner(i));
          next.contributions.push({partnerIndex:i,percentage:0,amount:0});
          next.profits.push({partnerIndex:i,percentage:0});
        }
      } else if (next.partners.length > n) {
        next.partners = next.partners.slice(0, n);
        next.contributions = next.contributions.slice(0, n);
        next.profits = next.profits.slice(0, n);
      }
      if (next.totalCapital > 0) {
        let runningTotal = 0;
        next.contributions = next.contributions.map((c, i) => {
          if (i < next.contributions.length - 1) {
            const amt = Math.round(next.totalCapital * (c.percentage || 0) / 100);
            runningTotal += amt;
            return { ...c, amount: amt };
          } else {
            return { ...c, amount: next.totalCapital - runningTotal };
          }
        });
      }
      return next as LLPData;
    });
  },[]);

  const dlDocx = async()=>{
    const hdrs = await authHeaders();
    const r = await fetch("/api/download-docx",{method:"POST",headers:hdrs,body:JSON.stringify(data)});
    if (!r.ok){alert("Download failed");return;}
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url;
    a.download=`LLP_Agreement_${(data.llpName||"draft").replace(/\s+/g,"_")}.docx`; a.click();
    URL.revokeObjectURL(url);
  };

  const dlPDF = async()=>{
    const el = document.getElementById("deedContent");
    const rawHtml = el ? el.innerHTML : (data.manualHtml || html);
    const hdrs = await authHeaders();
    const r = await fetch("/api/download-pdf",{method:"POST",headers:hdrs,body:JSON.stringify({ html: rawHtml, llpName: data.llpName })});
    if (!r.ok){alert("Failed");return;}
    const blob = new Blob([await r.text()],{type:"text/html"});
    const url = URL.createObjectURL(blob);
    window.open(url,"_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleSaveHtml = (newHtml: string) => {
    setData(prev => ({ ...prev, manualHtml: newHtml }));
  };

  const handleResetHtml = () => {
    if (!confirm("Are you sure you want to revert to the auto-generated version? Your manual edits will be lost.")) return;
    setData(prev => {
      const { manualHtml, ...rest } = prev;
      return rest as LLPData;
    });
  };

  const restart=()=>{ setData(defaultData()); setStep("num_partners"); setDone(false); setHtml(""); };

  return (
    <div className="mobile-stack" style={{display:"grid",gridTemplateColumns:"420px 1fr",height:"100vh",overflow:"hidden"}}>
      <div style={{display: mobileTab === "chat" ? "flex" : "none", flexDirection:"column", height:"100%"}}
           id="chat-section">
        <ChatPanel data={data} step={step} done={done} pct={getPct(data)} sessionId={sessionId}
          onUpdates={applyUpdates} onStep={setStep} onDone={()=>setDone(true)} onRestart={restart}
          onRestore={(d, s, dn) => { setData(d); setStep(s); setDone(dn); }}
          onBackToDashboard={() => router.push("/dashboard")}
          getAuthHeaders={authHeaders} />
      </div>
      <div style={{display: mobileTab === "preview" ? "flex" : undefined, flexDirection:"column", height:"100%"}}
           className={mobileTab !== "preview" ? "mobile-hide" : ""}
           id="preview-section">
        <DocumentPanel 
          html={data.manualHtml || html} 
          pct={getPct(data)} 
          missing={getMissing(data)} 
          isManual={!!data.manualHtml}
          onDocx={dlDocx} 
          onPDF={dlPDF}
          onSaveHtml={handleSaveHtml}
          onResetHtml={handleResetHtml}
        />
      </div>

      {/* Mobile Tab Bar */}
      <div className="mobile-tab-bar" style={{
        position:"fixed",bottom:0,left:0,right:0,zIndex:50,
        background:"#0c1929",
        borderTop:"1px solid rgba(255, 255, 255, 0.06)",
        padding:"6px 8px",
        gap:6,
      }}>
        <button
          className="mobile-tab"
          onClick={() => setMobileTab("chat")}
          style={{
            background: mobileTab === "chat" ? "#142640" : "transparent",
            color: mobileTab === "chat" ? "#fff" : "rgba(148, 163, 184, 0.7)",
            borderRadius:10,
            fontWeight: mobileTab === "chat" ? 700 : 600,
            fontSize: 12,
            letterSpacing: "-0.2px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat
        </button>
        <button
          className="mobile-tab"
          onClick={() => setMobileTab("preview")}
          style={{
            background: mobileTab === "preview" ? "#142640" : "transparent",
            color: mobileTab === "preview" ? "#fff" : "rgba(148, 163, 184, 0.7)",
            borderRadius:10,
            fontWeight: mobileTab === "preview" ? 700 : 600,
            fontSize: 12,
            letterSpacing: "-0.2px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Preview
        </button>
      </div>
    </div>
  );
}
