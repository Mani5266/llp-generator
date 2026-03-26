"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

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
      <div className="auth-loading">
        <div className="auth-spinner" />
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* ── LEFT PANEL: Branding ── */}
      <div className="auth-brand-panel">
        {/* Abstract gradient shapes */}
        <div className="auth-brand-shape auth-brand-shape-1" />
        <div className="auth-brand-shape auth-brand-shape-2" />
        <div className="auth-brand-shape auth-brand-shape-3" />

        <div className="auth-brand-content">
          {/* Logo */}
          <div className="auth-brand-logo">OnEasy</div>

          {/* Hero text */}
          <h1 className="auth-brand-heading">LLP Agreement Generator</h1>
          <p className="auth-brand-subtext">
            Generate legally compliant LLP agreements in minutes.
            Professional, accurate, and ready to sign.
          </p>

          {/* Feature list */}
          <ul className="auth-feature-list">
            <li className="auth-feature-item">
              <svg className="auth-check-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              AI-Powered Document Generation
            </li>
            <li className="auth-feature-item">
              <svg className="auth-check-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Legally Compliant Templates
            </li>
            <li className="auth-feature-item">
              <svg className="auth-check-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Instant DOCX Export
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="auth-brand-footer">
          &copy; 2026 OnEasy. All rights reserved.
        </div>
      </div>

      {/* ── RIGHT PANEL: Auth Form ── */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper animate-slideUp">
          <h2 className="auth-form-title">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </h2>
          <p className="auth-form-subtitle">
            {isSignUp
              ? "Get started with OnEasy in seconds."
              : "Enter your credentials to access the dashboard."}
          </p>

          {/* Tab switch */}
          <div className="auth-tab-group">
            <button
              type="button"
              className={`auth-tab ${!isSignUp ? "auth-tab-active" : ""}`}
              onClick={() => { setIsSignUp(false); setError(""); setSuccess(""); }}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-tab ${isSignUp ? "auth-tab-active" : ""}`}
              onClick={() => { setIsSignUp(true); setError(""); setSuccess(""); }}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-email">Email Address</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="auth-input"
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="auth-input"
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </div>

            {/* Error alert */}
            {error && (
              <div className="auth-alert auth-alert-error animate-fadeIn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Success alert */}
            {success && (
              <div className="auth-alert auth-alert-success animate-fadeIn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={busy} className="auth-submit">
              {busy
                ? (isSignUp ? "Creating Account..." : "Signing In...")
                : (isSignUp ? "Create Account" : "Sign In")}
            </button>
          </form>

          {/* Bottom link */}
          <p className="auth-switch-text">
            {isSignUp ? "Already have an account? " : "Don\u2019t have an account? "}
            <button
              type="button"
              className="auth-switch-btn"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }}
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
