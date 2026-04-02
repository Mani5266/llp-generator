"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

/* ── Check icon for feature bullets ─────────────────────────── */
function CheckIcon() {
  return (
    <svg
      className="auth-check-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ── Alert icon ─────────────────────────────────────────────── */
function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

/* ── Main Login Page ────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  /* redirect if already authenticated */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  /* tab switch — clears messages */
  const switchTab = (tab: "login" | "signup") => {
    setMode(tab);
    setError("");
    setSuccess("");
  };

  /* form submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }
        if (data.session) {
          router.replace("/dashboard");
          return;
        }

        setSuccess(
          "Account created! Please check your email to confirm, then login."
        );
        setMode("login");
      } else {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }
        router.replace("/dashboard");
        return;
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  /* ── Loading gate ───────────────────────────────────────── */
  if (checking) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────── */
  const isLogin = mode === "login";

  return (
    <div className="auth-container">
      {/* ── Left Panel: Brand ─────────────────────────────── */}
      <div className="auth-brand-panel">
        {/* Abstract gradient shapes */}
        <div className="auth-brand-shape auth-brand-shape-1" />
        <div className="auth-brand-shape auth-brand-shape-2" />
        <div className="auth-brand-shape auth-brand-shape-3" />

        <div className="auth-brand-content">
          <div className="auth-brand-logo">OnEasy</div>

          <h1 className="auth-brand-heading">
            LLP Agreement<br />Generator
          </h1>

          <p className="auth-brand-subtext">
            Draft professional LLP Agreements with AI assistance.
            Comprehensive clauses, compliant structure, and instant export.
          </p>

          <ul className="auth-feature-list">
            <li className="auth-feature-item">
              <CheckIcon />
              AI-Powered Agreement Drafting
            </li>
            <li className="auth-feature-item">
              <CheckIcon />
              Comprehensive Clause Library
            </li>
            <li className="auth-feature-item">
              <CheckIcon />
              Instant DOCX &amp; PDF Export
            </li>
          </ul>
        </div>

        <div className="auth-brand-footer">
          &copy; {new Date().getFullYear()} OnEasy. All rights reserved.
        </div>
      </div>

      {/* ── Right Panel: Form ─────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          <h2 className="auth-form-title">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </h2>
          <p className="auth-form-subtitle">
            {isLogin
              ? "Enter your credentials to access the dashboard."
              : "Enter your details to get started."}
          </p>

          {/* Tabs */}
          <div className="auth-tab-group">
            <button
              type="button"
              onClick={() => switchTab("login")}
              className={`auth-tab ${isLogin ? "auth-tab-active" : ""}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchTab("signup")}
              className={`auth-tab ${!isLogin ? "auth-tab-active" : ""}`}
            >
              Sign Up
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="auth-alert auth-alert-error animate-fadeIn">
              <AlertIcon />
              {error}
            </div>
          )}
          {success && (
            <div className="auth-alert auth-alert-success animate-fadeIn">
              <SuccessIcon />
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                autoComplete="email"
                className="auth-input"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={6}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="auth-input"
              />
            </div>

            {!isLogin && (
              <div className="auth-field animate-fadeIn">
                <label className="auth-label">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  className="auth-input"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="auth-submit"
            >
              {loading ? "..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="auth-switch-text">
            {isLogin ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signup")}
                  className="auth-switch-btn"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("login")}
                  className="auth-switch-btn"
                >
                  Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
