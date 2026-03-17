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
        if (signUpError) { setError(signUpError.message); }
        else { setSuccess("Account created! Check your email for confirmation, or sign in if email confirmation is disabled."); }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) { setError(signInError.message); }
        else { router.replace("/dashboard"); }
      }
    } catch { setError("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  };

  if (loading) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:isDark?"#0d1117":"linear-gradient(135deg, #0f2137 0%, #1a3a5c 100%)"}}>
        <div style={{width:40,height:40,border:"3px solid rgba(255,255,255,0.15)",borderTopColor:"#2dd4a0",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:isDark?"#0d1117":"linear-gradient(135deg, #0f2137 0%, #1a3a5c 100%)",padding:20,fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",transition:"background .3s ease"}}>
      {/* Theme Toggle - Top Right */}
      <button
        className="theme-toggle"
        onClick={toggle}
        style={{position:"fixed",top:20,right:20,zIndex:10}}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
      </button>

      <div className="animate-slideUp" style={{width:"100%",maxWidth:420,background:isDark?"#161b22":"#fff",borderRadius:20,padding:"40px 36px",boxShadow:isDark?"0 8px 40px rgba(0,0,0,0.5)":"0 8px 40px rgba(15,33,55,0.15)",border:`1px solid ${isDark?"#30363d":"rgba(255,255,255,0.15)"}`,transition:"background .3s ease, border-color .3s ease"}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:28}}>
          <div style={{width:38,height:38,borderRadius:10,background:"var(--accent-gradient)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:17,color:isDark?"#e6edf3":"#0f2137",letterSpacing:"-0.4px"}}>Deed AI</div>
            <div style={{fontSize:11,color:isDark?"#8b949e":"var(--accent)",fontWeight:500}}>LLP Agreement Generator</div>
          </div>
        </div>

        <h1 style={{fontSize:22,fontWeight:800,color:isDark?"#e6edf3":"#0f2137",margin:"0 0 6px",letterSpacing:"-0.5px"}}>{isSignUp ? "Create Account" : "Welcome Back"}</h1>
        <p style={{fontSize:14,color:isDark?"#8b949e":"var(--text-muted)",marginBottom:24}}>
          {isSignUp ? "Sign up to start generating LLP agreements" : "Sign in to access your LLP agreements"}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:13,fontWeight:600,color:isDark?"#b1bac4":"var(--text-secondary)",marginBottom:6}}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{width:"100%",padding:"11px 14px",fontSize:14,border:`1.5px solid ${isDark?"#30363d":"#e2e8f0"}`,borderRadius:10,outline:"none",background:isDark?"#0d1117":"#f8fafc",color:isDark?"#e6edf3":"var(--text-primary)",fontFamily:"inherit",transition:"all .2s"}}
            />
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:13,fontWeight:600,color:isDark?"#b1bac4":"var(--text-secondary)",marginBottom:6}}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{width:"100%",padding:"11px 14px",fontSize:14,border:`1.5px solid ${isDark?"#30363d":"#e2e8f0"}`,borderRadius:10,outline:"none",background:isDark?"#0d1117":"#f8fafc",color:isDark?"#e6edf3":"var(--text-primary)",fontFamily:"inherit",transition:"all .2s"}}
            />
          </div>

          {error && <div className="animate-fadeIn" style={{padding:"10px 14px",borderRadius:10,background:isDark?"#3b1c1c":"#fef2f2",color:isDark?"#f87171":"#dc2626",fontSize:13,marginBottom:16,border:`1px solid ${isDark?"#7f1d1d":"#fecaca"}`}}>{error}</div>}
          {success && <div className="animate-fadeIn" style={{padding:"10px 14px",borderRadius:10,background:isDark?"#0d2818":"#f0fdf4",color:isDark?"#2dd4a0":"#16a34a",fontSize:13,marginBottom:16,border:`1px solid ${isDark?"#1a6b3c":"#bbf7d0"}`}}>{success}</div>}

          <button type="submit" disabled={busy}
            style={{width:"100%",padding:"12px",fontSize:15,fontWeight:700,background:"var(--accent-gradient)",color:"white",border:"none",borderRadius:12,cursor:"pointer",opacity:busy?0.7:1,transition:"all .2s",fontFamily:"inherit",letterSpacing:"-0.3px"}}
          >
            {busy ? (isSignUp ? "Creating Account..." : "Signing In...") : (isSignUp ? "Create Account" : "Sign In")}
          </button>
        </form>

        <p style={{textAlign:"center",fontSize:13,color:isDark?"#8b949e":"var(--text-muted)",marginTop:20}}>
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }}
            style={{background:"none",border:"none",color:"var(--accent)",fontWeight:600,cursor:"pointer",textDecoration:"underline",fontFamily:"inherit",fontSize:13}}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}
