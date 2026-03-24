"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const isDark = theme === "dark";

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) { setError(signUpError); }
        else { setSuccess("Account created! Check your email for confirmation, or sign in if email confirmation is disabled."); }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) { setError(signInError); }
        else { router.replace("/dashboard"); }
      }
    } catch { setError("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  };

  if (loading) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:isDark?"#0b0f19":"#0c1929"}}>
        <div style={{width:40,height:40,border:"3px solid rgba(255,255,255,0.1)",borderTopColor:"#10b981",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      </div>
    );
  }

  return (
    <div style={{
      minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background: isDark
        ? "radial-gradient(ellipse at 50% 0%, #0f1d2e 0%, #0b0f19 70%)"
        : "radial-gradient(ellipse at 50% 0%, #1a3a5c 0%, #0c1929 70%)",
      padding:24,
      fontFamily:"'Inter',-apple-system,system-ui,sans-serif",
      transition:"background .35s ease",
      position:"relative",overflow:"hidden"
    }}>
      {/* Subtle grid pattern overlay */}
      <div style={{
        position:"absolute",inset:0,
        backgroundImage:`radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
        backgroundSize:"32px 32px",
        pointerEvents:"none"
      }}/>

      {/* Accent glow */}
      <div style={{
        position:"absolute",top:"-20%",left:"50%",transform:"translateX(-50%)",
        width:"600px",height:"400px",
        background:"radial-gradient(ellipse, rgba(13,150,104,0.12) 0%, transparent 70%)",
        pointerEvents:"none"
      }}/>

      {/* Theme Toggle */}
      <button
        className="theme-toggle"
        onClick={toggle}
        style={{position:"fixed",top:24,right:24,zIndex:10}}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
      </button>

      <div className="animate-slideUp" style={{
        width:"100%",maxWidth:420,
        background: isDark ? "rgba(17,24,39,0.9)" : "rgba(255,255,255,0.97)",
        backdropFilter:"blur(20px) saturate(180%)",
        WebkitBackdropFilter:"blur(20px) saturate(180%)",
        borderRadius:24,padding:"44px 40px",
        boxShadow: isDark
          ? "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)"
          : "0 20px 60px rgba(12,25,41,0.2), 0 0 0 1px rgba(255,255,255,0.8)",
        transition:"background .35s ease",
        position:"relative",zIndex:1
      }}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:32}}>
          <div style={{width:44,height:44,borderRadius:14,background:"var(--accent-gradient)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(13,150,104,0.3)"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:18,color:isDark?"#e8edf5":"#0c1929",letterSpacing:"-0.5px"}}>Deed AI</div>
            <div style={{fontSize:11,color:isDark?"#7d8da3":"#6b7a8d",fontWeight:500,marginTop:1}}>LLP Agreement Generator</div>
          </div>
        </div>

        <h1 style={{fontSize:24,fontWeight:800,color:isDark?"#e8edf5":"#0c1929",margin:"0 0 6px",letterSpacing:"-0.5px"}}>
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h1>
        <p style={{fontSize:14,color:isDark?"#7d8da3":"var(--text-muted)",marginBottom:28,lineHeight:1.5}}>
          {isSignUp ? "Sign up to start generating LLP agreements" : "Sign in to access your LLP agreements"}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:18}}>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:isDark?"#b0bdd0":"var(--text-secondary)",marginBottom:7,textTransform:"uppercase",letterSpacing:"0.5px"}}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width:"100%",padding:"12px 16px",fontSize:14,
                border:`1.5px solid ${isDark?"#293548":"#e0e5ed"}`,
                borderRadius:"var(--radius-md)",outline:"none",
                background:isDark?"rgba(11,15,25,0.6)":"#f8f9fc",
                color:isDark?"#e8edf5":"var(--text-primary)",
                fontFamily:"inherit",transition:"all .2s"
              }}
            />
          </div>
          <div style={{marginBottom:24}}>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:isDark?"#b0bdd0":"var(--text-secondary)",marginBottom:7,textTransform:"uppercase",letterSpacing:"0.5px"}}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              style={{
                width:"100%",padding:"12px 16px",fontSize:14,
                border:`1.5px solid ${isDark?"#293548":"#e0e5ed"}`,
                borderRadius:"var(--radius-md)",outline:"none",
                background:isDark?"rgba(11,15,25,0.6)":"#f8f9fc",
                color:isDark?"#e8edf5":"var(--text-primary)",
                fontFamily:"inherit",transition:"all .2s"
              }}
            />
          </div>

          {error && (
            <div className="animate-fadeIn" style={{
              padding:"12px 16px",borderRadius:"var(--radius-md)",
              background:isDark?"rgba(220,38,38,0.1)":"#fef2f2",
              color:isDark?"#f87171":"#dc2626",fontSize:13,marginBottom:18,
              border:`1px solid ${isDark?"rgba(220,38,38,0.2)":"#fecaca"}`,
              display:"flex",alignItems:"center",gap:8
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {error}
            </div>
          )}
          {success && (
            <div className="animate-fadeIn" style={{
              padding:"12px 16px",borderRadius:"var(--radius-md)",
              background:isDark?"rgba(5,150,105,0.1)":"#f0fdf4",
              color:isDark?"#34d399":"#059669",fontSize:13,marginBottom:18,
              border:`1px solid ${isDark?"rgba(16,185,129,0.2)":"#bbf7d0"}`,
              display:"flex",alignItems:"center",gap:8
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              {success}
            </div>
          )}

          <button type="submit" disabled={busy}
            style={{
              width:"100%",padding:"13px",fontSize:15,fontWeight:700,
              background:"var(--accent-gradient)",color:"white",border:"none",
              borderRadius:"var(--radius-md)",cursor:"pointer",
              opacity:busy?0.7:1,transition:"all .2s cubic-bezier(0.16,1,0.3,1)",
              fontFamily:"inherit",letterSpacing:"-0.3px",
              boxShadow:"0 4px 14px rgba(13,150,104,0.3)"
            }}
          >
            {busy ? (isSignUp ? "Creating Account..." : "Signing In...") : (isSignUp ? "Create Account" : "Sign In")}
          </button>
        </form>

        <div style={{textAlign:"center",marginTop:24}}>
          <span style={{fontSize:13,color:isDark?"#7d8da3":"var(--text-muted)"}}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
          </span>
          <button onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }}
            style={{background:"none",border:"none",color:"var(--accent)",fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:13,transition:"color .15s"}}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
