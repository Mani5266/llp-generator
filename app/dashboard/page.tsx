"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
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
  const router = useRouter();
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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
    if (!user) return;
    if (!confirm("Delete this agreement? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("agreements").delete().eq("id", id).eq("user_id", user.id);
    setAgreements(prev => prev.filter(a => a.id !== id));
    setDeleting(null);
  };

  const startRename = (a: AgreementRow) => {
    setEditingId(a.id);
    setEditName(a.data?.llpName || "");
  };

  const saveRename = async (id: string) => {
    if (!user) return;
    const trimmed = editName.trim();
    setEditingId(null);
    setAgreements(prev => prev.map(a => {
      if (a.id !== id) return a;
      return { ...a, data: { ...a.data, llpName: trimmed } };
    }));
    const { data: row } = await supabase.from("agreements").select("data").eq("id", id).eq("user_id", user.id).single();
    if (row) {
      const updatedData = { ...(row.data as LLPData), llpName: trimmed };
      await supabase.from("agreements").update({ data: updatedData, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
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
      <div className="dash-loading">
        <div className="dash-spinner" />
        <span className="dash-loading-text">Loading...</span>
      </div>
    );
  }

  const completedCount = agreements.filter(a => a.is_done).length;
  const draftCount = agreements.filter(a => !a.is_done).length;

  return (
    <div className="dash-page">
      {/* ── Header ── */}
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="dash-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <div className="dash-logo-text">LLP Generator</div>
            <div className="dash-logo-sub">Agreement Dashboard</div>
          </div>
        </div>
        <div className="dash-header-right">
          <span className="dash-email mobile-hide">{user.email}</span>
          <button onClick={handleLogout} className="dash-logout-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="dash-main mobile-full">
        {/* Title + Actions Row */}
        <div className="dash-title-row">
          <div>
            <h1 className="dash-title">My Agreements</h1>
            <div className="dash-badges">
              <span className="dash-badge dash-badge-total">{agreements.length} total</span>
              {completedCount > 0 && (
                <span className="dash-badge dash-badge-complete">{completedCount} complete</span>
              )}
              {draftCount > 0 && (
                <span className="dash-badge dash-badge-draft">
                  {draftCount} draft{draftCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <button className="dash-new-btn animate-fadeIn" onClick={createNew}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Agreement
          </button>
        </div>

        {/* ── Search Bar ── */}
        {agreements.length > 0 && (
          <div className="dash-search-row">
            <div className="dash-search-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca8b7" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search agreements..."
                className="dash-search-input"
              />
              {search && (
                <button onClick={() => setSearch("")} className="dash-search-clear">Clear</button>
              )}
            </div>
            {search && (
              <span className="dash-search-count">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* ── Content Area ── */}
        {fetching ? (
          /* Skeleton Loaders */
          <div className="dash-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-card" style={{ padding: 22 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-title" style={{ marginBottom: 8 }} />
                    <div className="skeleton skeleton-text" style={{ width: "45%" }} />
                  </div>
                </div>
                <div className="skeleton skeleton-bar" style={{ marginBottom: 16 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 10 }} />
                  <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : agreements.length === 0 ? (
          /* Empty State */
          <div className="dash-empty animate-slideUp">
            <div className="dash-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0c1929" strokeWidth="1.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </div>
            <p className="dash-empty-title">No agreements yet</p>
            <p className="dash-empty-desc">
              Create your first LLP agreement to get started. The AI assistant will guide you through the process.
            </p>
            <button className="dash-new-btn" onClick={createNew} style={{ marginTop: 24 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Agreement
            </button>
          </div>
        ) : filtered.length === 0 ? (
          /* No Search Results */
          <div className="dash-empty animate-fadeIn">
            <div className="dash-empty-icon" style={{ background: "#eef0f4" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca8b7" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p className="dash-empty-title">No matches found</p>
            <p className="dash-empty-desc">
              No agreements match &quot;{search}&quot;. Try a different search term.
            </p>
          </div>
        ) : (
          /* Agreement Cards Grid */
          <div className="dash-grid">
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
                  className="dash-card animate-fadeIn"
                  style={{ animationDelay: `${idx * 0.06}s`, animationFillMode: "both" }}
                >
                  {/* Card Header */}
                  <div className="dash-card-header">
                    <div className={`dash-card-icon ${a.is_done ? "dash-card-icon-done" : ""}`}>
                      {a.is_done ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0c1929" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14,2 14,8 20,8" />
                        </svg>
                      )}
                    </div>
                    <div className="dash-card-meta">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          autoFocus
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveRename(a.id); if (e.key === "Escape") setEditingId(null); }}
                          onBlur={() => saveRename(a.id)}
                          placeholder="Enter agreement name..."
                          className="dash-rename-input"
                        />
                      ) : (
                        <div className="dash-card-name-row">
                          <div className="dash-card-name">{name}</div>
                          <button onClick={() => startRename(a)} title="Rename" className="dash-rename-btn">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <div className="dash-card-detail">
                        {partners} partner{partners !== 1 ? "s" : ""} &middot; {updated}
                      </div>
                    </div>
                    <span className={`dash-status ${a.is_done ? "dash-status-complete" : "dash-status-draft"}`}>
                      {a.is_done ? "Complete" : "Draft"}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="dash-progress-row">
                    <div className="dash-progress-track">
                      <div
                        className="dash-progress-fill progress-bar"
                        style={{ width: `${pct}%`, background: pct === 100 ? "#059669" : "#0c1929" }}
                      />
                    </div>
                    <span className="dash-progress-pct" style={{ color: pct === 100 ? "#059669" : "#0c1929" }}>
                      {pct}%
                    </span>
                  </div>

                  {/* Action Row */}
                  <div className="dash-card-actions">
                    <button
                      onClick={() => router.push(`/?id=${a.id}`)}
                      className={`dash-action-btn ${a.is_done ? "dash-action-view" : "dash-action-continue"}`}
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
                      className="dash-delete-btn"
                      style={{ opacity: deleting === a.id ? 0.4 : 1 }}
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
