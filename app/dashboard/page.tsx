"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LLPData, getPct, defaultData } from "@/types";

interface AgreementRow {
  id: string;
  data: LLPData;
  step: string;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const isDark = theme === "dark";

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    supabase
      .from("agreements")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setAgreements(data as AgreementRow[]);
        } else if (error) {
          supabase
            .from("agreements")
            .select("*")
            .order("updated_at", { ascending: false })
            .then(({ data: allData }) => {
              if (allData) setAgreements(allData as AgreementRow[]);
            });
        }
        setFetching(false);
      });
  }, [user]);

  const createNew = async () => {
    if (!user) return;
    let result = await supabase
      .from("agreements")
      .insert([{ data: defaultData(), step: "num_partners", is_done: false, user_id: user.id }])
      .select()
      .single();

    if (result.error) {
      result = await supabase
        .from("agreements")
        .insert([{ data: defaultData(), step: "num_partners", is_done: false }])
        .select()
        .single();
    }

    if (result.error) {
      alert("Failed to create agreement: " + result.error.message);
      return;
    }

    if (result.data) {
      router.push(`/?id=${result.data.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this agreement? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("agreements").delete().eq("id", id);
    setAgreements(prev => prev.filter(a => a.id !== id));
    setDeleting(null);
  };

  const startRename = (a: AgreementRow) => {
    setEditingId(a.id);
    setEditName(a.data?.llpName || "");
  };

  const saveRename = async (id: string) => {
    const trimmed = editName.trim();
    setEditingId(null);
    setAgreements(prev => prev.map(a => {
      if (a.id !== id) return a;
      return { ...a, data: { ...a.data, llpName: trimmed } };
    }));
    const { data: row } = await supabase.from("agreements").select("data").eq("id", id).single();
    if (row) {
      const updatedData = { ...(row.data as LLPData), llpName: trimmed };
      await supabase.from("agreements").update({ data: updatedData, updated_at: new Date().toISOString() }).eq("id", id);
    }
  };

  const filtered = agreements.filter(a => {
    if (!search.trim()) return true;
    const name = (a.data?.llpName || "Untitled Draft").toLowerCase();
    return name.includes(search.trim().toLowerCase());
  });

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  if (loading || !user) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg-primary)"}}>
        <div style={{width:40,height:40,border:"3px solid var(--bg-progress)",borderTopColor:"var(--accent)",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:"var(--bg-primary)",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",transition:"background .3s ease,color .3s ease"}}>
      {/* Header */}
      <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 28px",background:"var(--bg-header)",borderBottom:"1px solid var(--border-color)",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:38,height:38,borderRadius:10,background:"var(--accent-gradient)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"#fff",letterSpacing:"-0.4px"}}>Deed AI</div>
            <div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>Your Agreements</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span className="mobile-hide" style={{fontSize:13,color:"#94a3b8",fontWeight:500}}>{user.email}</span>
          {/* Theme Toggle */}
          <button className="theme-toggle" onClick={toggle} title={isDark ? "Light mode" : "Dark mode"}>
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          <button style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",fontSize:13,fontWeight:600,background:"rgba(255,255,255,0.08)",color:"#e2e8f0",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,cursor:"pointer",transition:"all .15s"}} onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{maxWidth:960,margin:"0 auto",padding:"32px 24px"}} className="mobile-full">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:16}}>
          <div>
            <h1 style={{fontSize:24,fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.5px",margin:0}}>My Agreements</h1>
            <p style={{fontSize:14,color:"var(--text-muted)",marginTop:4}}>{agreements.length} agreement{agreements.length !== 1 ? "s" : ""}</p>
          </div>
          <button className="animate-fadeIn" style={{display:"flex",alignItems:"center",gap:8,padding:"11px 22px",fontSize:14,fontWeight:700,background:"var(--accent-gradient)",color:"white",border:"none",borderRadius:12,cursor:"pointer",transition:"all .2s",letterSpacing:"-0.3px",boxShadow:"0 4px 14px rgba(26,155,108,0.25)"}} onClick={createNew}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Agreement
          </button>
        </div>

        {/* Search Bar */}
        {agreements.length > 0 && (
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <div style={{flex:1,display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"var(--bg-card)",borderRadius:12,border:"1.5px solid var(--border-color)",transition:"all .2s"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search agreements by name..."
                style={{flex:1,border:"none",outline:"none",fontSize:14,color:"var(--text-primary)",background:"transparent",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{background:"none",border:"none",color:"var(--text-faint)",cursor:"pointer",fontSize:14,padding:"2px 4px",borderRadius:4,flexShrink:0}}>✕</button>
              )}
            </div>
            {search && <span style={{fontSize:13,color:"var(--text-muted)",fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>}
          </div>
        )}

        {fetching ? (
          /* ── Skeleton Loaders ── */
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:18}}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton-card" style={{padding:20}}>
                <div style={{display:"flex",gap:12,marginBottom:14}}>
                  <div className="skeleton" style={{width:38,height:38,borderRadius:10}}/>
                  <div style={{flex:1}}>
                    <div className="skeleton skeleton-title" style={{marginBottom:8}}/>
                    <div className="skeleton skeleton-text" style={{width:"40%"}}/>
                  </div>
                </div>
                <div className="skeleton skeleton-bar" style={{marginBottom:14}}/>
                <div style={{display:"flex",gap:8}}>
                  <div className="skeleton" style={{width:100,height:36,borderRadius:10}}/>
                  <div className="skeleton" style={{width:36,height:36,borderRadius:8}}/>
                </div>
              </div>
            ))}
          </div>
        ) : agreements.length === 0 ? (
          <div className="animate-slideUp" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 20px",color:"var(--text-faint)"}}>
            <div style={{marginBottom:16}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{opacity:0.4}}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p style={{fontSize:18,fontWeight:700,color:"var(--text-secondary)",margin:"0 0 6px"}}>No agreements yet</p>
            <p style={{fontSize:14,color:"var(--text-faint)",textAlign:"center",maxWidth:300}}>Click &quot;New Agreement&quot; to get started with your first LLP Agreement.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="animate-fadeIn" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 20px",color:"var(--text-faint)"}}>
            <p style={{fontSize:18,fontWeight:700,color:"var(--text-secondary)",margin:"0 0 6px"}}>No matches found</p>
            <p style={{fontSize:14,color:"var(--text-faint)",textAlign:"center",maxWidth:300}}>No agreements match &quot;{search}&quot;. Try a different search term.</p>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:18}}>
            {filtered.map((a, idx) => {
              const pct = a.data ? getPct(a.data) : 0;
              const name = a.data?.llpName || "Untitled Draft";
              const partners = a.data?.partners?.filter((p: { fullName: string }) => p.fullName).length || 0;
              const updated = new Date(a.updated_at || a.created_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              });
              const isEditing = editingId === a.id;

              return (
                <div key={a.id} className="card-hover animate-fadeIn"
                  style={{
                    background:"var(--bg-card)",borderRadius:16,padding:20,
                    border:"1px solid var(--border-light)",
                    boxShadow:"var(--shadow-card)",transition:"all .3s ease",
                    animationDelay:`${idx * 0.07}s`,
                  }}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14}}>
                    <div style={{width:38,height:38,borderRadius:10,background:"var(--bg-header)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      {isEditing ? (
                        <input
                          type="text" value={editName} autoFocus
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveRename(a.id); if (e.key === "Escape") setEditingId(null); }}
                          onBlur={() => saveRename(a.id)}
                          placeholder="Enter agreement name..."
                          style={{width:"100%",padding:"4px 8px",fontSize:14,fontWeight:700,color:"var(--text-primary)",border:"1.5px solid var(--accent)",borderRadius:6,outline:"none",background:isDark?"#1c2333":"#f0fdf4",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",letterSpacing:"-0.3px",minWidth:0}}
                        />
                      ) : (
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{fontSize:15,fontWeight:700,color:"var(--text-primary)",letterSpacing:"-0.3px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                          <button onClick={() => startRename(a)} title="Rename" style={{background:"none",border:"none",color:"var(--text-faint)",cursor:"pointer",padding:2,borderRadius:4,display:"flex",alignItems:"center",flexShrink:0,transition:"color .15s"}}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        </div>
                      )}
                      <div style={{fontSize:12,color:"var(--text-faint)",marginTop:3}}>{partners} partner{partners !== 1 ? "s" : ""} • {updated}</div>
                    </div>
                    <span style={{
                      fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,whiteSpace:"nowrap",flexShrink:0,
                      background: a.is_done ? (isDark ? "#0d2818" : "#f0fdf4") : (isDark ? "#0c2d4a" : "#f0f9ff"),
                      color: a.is_done ? "#16a34a" : "#0284c7",
                      border: `1px solid ${a.is_done ? (isDark ? "#1a6b3c" : "#bbf7d0") : (isDark ? "#1a4d7a" : "#bae6fd")}`,
                    }}>
                      {a.is_done ? "Complete" : "Draft"}
                    </span>
                  </div>

                  {/* Progress */}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                    <div style={{flex:1,height:6,background:"var(--bg-progress)",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:4,background:pct===100?"#16a34a":"var(--accent-gradient)",width:`${pct}%`,transition:"width .5s ease"}}/>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:"var(--accent)",minWidth:32,textAlign:"right"}}>{pct}%</span>
                  </div>

                  {/* Actions */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <button style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",fontSize:13,fontWeight:700,background:"var(--bg-header)",color:"white",border:"none",borderRadius:10,cursor:"pointer",transition:"all .15s"}} onClick={() => router.push(`/?id=${a.id}`)}>
                      {a.is_done ? "View" : "Continue"}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                    <button
                      style={{display:"flex",alignItems:"center",padding:8,background:"none",border:`1px solid ${isDark?"#7f1d1d":"#fecaca"}`,borderRadius:8,color:"#ef4444",cursor:"pointer",transition:"all .15s",opacity:deleting===a.id?0.5:1}}
                      onClick={() => handleDelete(a.id)}
                      disabled={deleting===a.id}
                      title="Delete"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
