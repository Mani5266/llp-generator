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
        }
        setFetching(false);
      });
  }, [user]);

  const createNew = async () => {
    if (!user) return;
    const result = await supabase
      .from("agreements")
      .insert([{ data: defaultData(), step: "num_partners", is_done: false, user_id: user.id }])
      .select()
      .single();

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
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}>
          <div style={{
            width: 44,
            height: 44,
            border: "3px solid var(--bg-progress)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin .8s linear infinite",
          }} />
          <span style={{ fontSize: 13, color: "var(--text-faint)", fontWeight: 500, letterSpacing: "-0.2px" }}>Loading...</span>
        </div>
      </div>
    );
  }

  const completedCount = agreements.filter(a => a.is_done).length;
  const draftCount = agreements.filter(a => !a.is_done).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      transition: "background 0.35s ease, color 0.35s ease",
    }}>
      {/* ── Header ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 28px",
        background: "var(--bg-header)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-md)",
            background: "var(--accent-gradient)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(13, 150, 104, 0.25)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.5px" }}>Deed AI</div>
            <div style={{ fontSize: 11, color: "rgba(148, 163, 184, 0.8)", fontWeight: 500, letterSpacing: "0.3px", marginTop: 1 }}>Agreement Dashboard</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="mobile-hide" style={{
            fontSize: 12,
            color: "rgba(148, 163, 184, 0.7)",
            fontWeight: 500,
            padding: "5px 12px",
            background: "rgba(255, 255, 255, 0.04)",
            borderRadius: "var(--radius-full)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}>{user.email}</span>
          <button className="theme-toggle" onClick={toggle} title={isDark ? "Light mode" : "Dark mode"}>
            {isDark ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            )}
          </button>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 600,
              background: "rgba(255, 255, 255, 0.06)",
              color: "rgba(226, 232, 240, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              letterSpacing: "-0.2px",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Logout
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 100px" }} className="mobile-full">
        {/* Title + Actions Row */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 16,
        }}>
          <div>
            <h1 style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.6px",
              margin: 0,
              lineHeight: 1.2,
            }}>My Agreements</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-muted)",
                padding: "3px 10px",
                background: "var(--bg-tertiary)",
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--border-light)",
              }}>
                {agreements.length} total
              </span>
              {completedCount > 0 && (
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#059669",
                  padding: "3px 10px",
                  background: isDark ? "rgba(5, 150, 105, 0.1)" : "#f0fdf4",
                  borderRadius: "var(--radius-full)",
                  border: `1px solid ${isDark ? "rgba(5, 150, 105, 0.2)" : "#bbf7d0"}`,
                }}>
                  {completedCount} complete
                </span>
              )}
              {draftCount > 0 && (
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0284c7",
                  padding: "3px 10px",
                  background: isDark ? "rgba(2, 132, 199, 0.1)" : "#f0f9ff",
                  borderRadius: "var(--radius-full)",
                  border: `1px solid ${isDark ? "rgba(2, 132, 199, 0.2)" : "#bae6fd"}`,
                }}>
                  {draftCount} draft{draftCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <button
            className="btn-primary animate-fadeIn"
            onClick={createNew}
            style={{
              padding: "10px 22px",
              fontSize: 13,
              fontWeight: 700,
              borderRadius: "var(--radius-md)",
              letterSpacing: "-0.3px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Agreement
          </button>
        </div>

        {/* ── Search Bar ── */}
        {agreements.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 16px",
              background: "var(--bg-card)",
              borderRadius: "var(--radius-md)",
              border: "1.5px solid var(--border-color)",
              boxShadow: "var(--shadow-xs)",
              transition: "all 0.2s ease",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search agreements..."
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  background: "transparent",
                  fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: "-0.2px",
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "none",
                    color: "var(--text-faint)",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: "var(--radius-sm)",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {search && (
              <span style={{
                fontSize: 12,
                color: "var(--text-muted)",
                fontWeight: 600,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}>
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* ── Content Area ── */}
        {fetching ? (
          /* Skeleton Loaders */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-card" style={{ padding: 22 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "var(--radius-md)" }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-title" style={{ marginBottom: 8 }} />
                    <div className="skeleton skeleton-text" style={{ width: "45%" }} />
                  </div>
                </div>
                <div className="skeleton skeleton-bar" style={{ marginBottom: 16 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <div className="skeleton" style={{ width: 100, height: 36, borderRadius: "var(--radius-md)" }} />
                  <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : agreements.length === 0 ? (
          /* Empty State */
          <div className="animate-slideUp" style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: "var(--radius-xl)",
              background: "var(--accent-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </div>
            <p style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: "0 0 6px",
              letterSpacing: "-0.4px",
            }}>No agreements yet</p>
            <p style={{
              fontSize: 13,
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: 280,
              lineHeight: 1.5,
            }}>
              Create your first LLP agreement to get started. The AI assistant will guide you through the process.
            </p>
            <button
              className="btn-primary"
              onClick={createNew}
              style={{ marginTop: 24, padding: "10px 24px", fontSize: 13, fontWeight: 700, borderRadius: "var(--radius-md)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Agreement
            </button>
          </div>
        ) : filtered.length === 0 ? (
          /* No Search Results */
          <div className="animate-fadeIn" style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "var(--radius-lg)",
              background: "var(--bg-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 6px", letterSpacing: "-0.3px" }}>
              No matches found
            </p>
            <p style={{ fontSize: 13, color: "var(--text-faint)", textAlign: "center", maxWidth: 280, lineHeight: 1.5 }}>
              No agreements match &quot;{search}&quot;. Try a different search term.
            </p>
          </div>
        ) : (
          /* Agreement Cards Grid */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {filtered.map((a, idx) => {
              const pct = a.data ? getPct(a.data) : 0;
              const name = a.data?.llpName || "Untitled Draft";
              const partners = a.data?.partners?.filter((p: { fullName: string }) => p.fullName).length || 0;
              const updated = new Date(a.updated_at || a.created_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              });
              const isEditing = editingId === a.id;

              return (
                <div
                  key={a.id}
                  className="card-hover animate-fadeIn"
                  style={{
                    background: "var(--bg-card)",
                    borderRadius: "var(--radius-lg)",
                    padding: 20,
                    border: "1px solid var(--border-light)",
                    boxShadow: "var(--shadow-card)",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    animationDelay: `${idx * 0.06}s`,
                    animationFillMode: "both",
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: "var(--radius-md)",
                      background: a.is_done ? "var(--accent-gradient)" : "var(--bg-header)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: a.is_done ? "0 2px 8px rgba(13, 150, 104, 0.2)" : "none",
                    }}>
                      {a.is_done ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14,2 14,8 20,8" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          autoFocus
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveRename(a.id); if (e.key === "Escape") setEditingId(null); }}
                          onBlur={() => saveRename(a.id)}
                          placeholder="Enter agreement name..."
                          style={{
                            width: "100%",
                            padding: "4px 8px",
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            border: "1.5px solid var(--accent)",
                            borderRadius: "var(--radius-sm)",
                            outline: "none",
                            background: isDark ? "rgba(16, 185, 129, 0.05)" : "rgba(13, 150, 104, 0.04)",
                            fontFamily: "'Inter', system-ui, sans-serif",
                            letterSpacing: "-0.3px",
                            minWidth: 0,
                          }}
                        />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            letterSpacing: "-0.3px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}>{name}</div>
                          <button
                            onClick={() => startRename(a)}
                            title="Rename"
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--text-faint)",
                              cursor: "pointer",
                              padding: 3,
                              borderRadius: "var(--radius-sm)",
                              display: "flex",
                              alignItems: "center",
                              flexShrink: 0,
                              transition: "color 0.15s ease",
                              opacity: 0.6,
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <div style={{
                        fontSize: 11,
                        color: "var(--text-faint)",
                        marginTop: 3,
                        fontWeight: 500,
                        letterSpacing: "-0.1px",
                      }}>
                        {partners} partner{partners !== 1 ? "s" : ""} &middot; {updated}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: "var(--radius-full)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      letterSpacing: "0.3px",
                      textTransform: "uppercase",
                      background: a.is_done
                        ? (isDark ? "rgba(5, 150, 105, 0.12)" : "#f0fdf4")
                        : (isDark ? "rgba(2, 132, 199, 0.12)" : "#f0f9ff"),
                      color: a.is_done ? "#059669" : "#0284c7",
                      border: `1px solid ${a.is_done
                        ? (isDark ? "rgba(5, 150, 105, 0.25)" : "#bbf7d0")
                        : (isDark ? "rgba(2, 132, 199, 0.25)" : "#bae6fd")
                      }`,
                    }}>
                      {a.is_done ? "Complete" : "Draft"}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{
                      flex: 1,
                      height: 5,
                      background: "var(--bg-progress)",
                      borderRadius: "var(--radius-full)",
                      overflow: "hidden",
                    }}>
                      <div
                        className="progress-bar"
                        style={{
                          height: "100%",
                          borderRadius: "var(--radius-full)",
                          background: pct === 100 ? "#059669" : "var(--accent-gradient)",
                          width: `${pct}%`,
                          transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      />
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: pct === 100 ? "#059669" : "var(--accent)",
                      minWidth: 30,
                      textAlign: "right",
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: "-0.5px",
                    }}>{pct}%</span>
                  </div>

                  {/* Action Row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <button
                      onClick={() => router.push(`/?id=${a.id}`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 16px",
                        fontSize: 12,
                        fontWeight: 700,
                        background: a.is_done ? "var(--accent-gradient)" : "var(--bg-header)",
                        color: "white",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        letterSpacing: "-0.2px",
                        fontFamily: "'Inter', system-ui, sans-serif",
                        boxShadow: a.is_done ? "0 2px 8px rgba(13, 150, 104, 0.2)" : "none",
                      }}
                    >
                      {a.is_done ? "View" : "Continue"}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={deleting === a.id}
                      title="Delete"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 34,
                        height: 34,
                        background: "none",
                        border: `1px solid ${isDark ? "rgba(127, 29, 29, 0.5)" : "#fecaca"}`,
                        borderRadius: "var(--radius-sm)",
                        color: "#ef4444",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        opacity: deleting === a.id ? 0.4 : 0.7,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
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
