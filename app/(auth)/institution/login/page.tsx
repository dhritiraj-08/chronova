"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveUserRole, roleHomePath } from "@/lib/auth/resolveRole";
import { Mail, Lock, Eye, EyeOff, ArrowRight, GraduationCap, Users, ClipboardCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

// This is the INSTITUTION portal login — the only entry point that ever
// redirects to /admin or /teacher. It never redirects to /dashboard: an
// account with no institution_members row (a plain student account, even
// one that's signed in successfully) gets an inline "not an institution
// account" message here instead of being silently sent anywhere. Compare
// /login, the student portal, which always lands on /dashboard and never
// checks institution role at all — the two are deliberately independent so
// the same email can be both a student and an institution member.
export default function InstitutionLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notInstitution, setNotInstitution] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const role = await resolveUserRole(supabase, user);
      if (role === "admin" || role === "teacher") {
        router.push(roleHomePath(role));
      }
      // role === "student": stay on this page rather than redirecting
      // anywhere — they're signed in, just not as an institution member.
    });
  }, [router, supabase]);

  async function handleAuthenticatedUser(user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>) {
    const role = await resolveUserRole(supabase, user);
    if (role === "admin" || role === "teacher") {
      router.push(roleHomePath(role));
    } else {
      setNotInstitution(true);
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotInstitution(false);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const errMsg = error.message.toLowerCase();
      if (errMsg.includes("email not confirmed") || errMsg.includes("email not verified")) {
        try {
          const confirmRes = await fetch("/api/auth/confirm-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const confirmData = await confirmRes.json();

          if (confirmRes.ok && confirmData.success) {
            const retry = await supabase.auth.signInWithPassword({ email, password });
            if (retry.error || !retry.data.user) {
              setError(retry.error?.message || "Sign in failed.");
              setLoading(false);
            } else {
              await handleAuthenticatedUser(retry.data.user);
            }
          } else {
            setError(confirmData.error || error.message);
            setLoading(false);
          }
        } catch (err: any) {
          setError(err.message || error.message);
          setLoading(false);
        }
      } else {
        setError(error.message);
        setLoading(false);
      }
    } else if (data.user) {
      await handleAuthenticatedUser(data.user);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }} className="page-bg animate-fade">
      <div className="page-content" style={{ display: "flex", width: "100%", minHeight: "100vh" }}>

        {/* Left panel */}
        <div style={{
          flex: "0 0 420px", display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "48px 36px",
          borderRight: "1px solid var(--c-border-1)",
          background: "var(--c-surface-0)",
          position: "relative",
          zIndex: 10
        }} className="responsive-auth-left">

          {/* Logo */}
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", marginBottom: "36px" }}>
            <Logo size={24} />
          </Link>

          {/* Heading */}
          <div style={{ marginBottom: "20px" }}>
            <p className="eyebrow">Institution Portal</p>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 600, letterSpacing: "-0.015em", color: "var(--c-text-primary)", marginTop: "4px" }}>
              Sign in to manage your institution
            </h1>
            <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "4px" }}>
              For admins and teachers only
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {error && (
              <div className="alert alert-error" style={{ padding: "8px 12px", fontSize: "12px" }}>
                <span>{error}</span>
              </div>
            )}

            {notInstitution && (
              <div className="alert alert-error" style={{ padding: "10px 12px", fontSize: "12px", lineHeight: 1.5 }}>
                No institution account found for this email. If you're setting up a new institution, you can{" "}
                <Link href="/signup" style={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }}>
                  sign up here
                </Link>. If you're a teacher, ask your admin to invite you first.
              </div>
            )}

            <div>
              <label className="form-label" htmlFor="inst-login-email">Email</label>
              <div className="input-group">
                <Mail size={14} className="input-icon" />
                <input
                  id="inst-login-email"
                  type="email"
                  className="input"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label className="form-label" htmlFor="inst-login-password">Password</label>
                <a href="#" style={{ fontSize: "11.5px", color: "var(--c-text-secondary)", textDecoration: "none", fontWeight: 500 }}>Forgot password?</a>
              </div>
              <div className="input-group">
                <Lock size={14} className="input-icon" />
                <input
                  id="inst-login-password"
                  type={showPw ? "text" : "password"}
                  className="input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: "36px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", display: "flex" }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              id="institution-login-submit-btn"
              type="submit"
              disabled={loading || !email || !password}
              className="btn btn-primary"
              style={{ width: "100%", padding: "10px", marginTop: "4px", justifyContent: "center", fontSize: "13px" }}
            >
              {loading ? "Signing in..." : <>Sign in <ArrowRight size={13} style={{ marginLeft: "2px" }} /></>}
            </button>
          </form>

          <p style={{ marginTop: "24px", fontSize: "12.5px", color: "var(--c-text-tertiary)", textAlign: "center" }}>
            Setting up a new institution?{" "}
            <Link href="/signup" style={{ color: "var(--c-text-primary)", textDecoration: "none", fontWeight: 500 }}>
              Sign up free
            </Link>
          </p>

          <Link href="/login" style={{
            marginTop: "14px", fontSize: "12px", color: "var(--c-text-tertiary)", textDecoration: "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
          }}>
            <GraduationCap size={12} /> Student? Sign in here instead
          </Link>
        </div>

        {/* Right panel */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center", padding: "48px",
          position: "relative", overflow: "hidden"
        }} className="responsive-auth-right">

          <div style={{ position: "relative", zIndex: 1, maxWidth: "420px", width: "100%" }}>
            <p className="eyebrow" style={{ marginBottom: "14px", justifyContent: "center", display: "flex" }}>
              Built for schools and colleges
            </p>

            <div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
              <p style={{ fontSize: "15px", fontWeight: 400, lineHeight: 1.6, color: "var(--c-text-primary)", fontStyle: "italic" }}>
                "Generating a conflict-free timetable used to take our admin team a full weekend. Now it's minutes."
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "20px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>RS</div>
                <div>
                  <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>Ritu Sharma</p>
                  <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", fontWeight: 500 }}>Vice Principal, Delhi Public School</p>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { icon: Users, title: "Manage teachers and classes", sub: "Roster, availability, and subjects in one place" },
                { icon: GraduationCap, title: "AI-generated timetables", sub: "Conflict-free schedules across every batch" },
                { icon: ClipboardCheck, title: "Requests and notifications", sub: "Reschedules, leave, and updates handled in-app" },
              ].map(({ icon: Icon, title, sub }) => (
                <div key={title} className="card" style={{ padding: "14px 16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: "var(--c-accent-dim)", border: "1px solid var(--c-accent-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={14} color="var(--c-accent-dark)" />
                  </div>
                  <div>
                    <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>{title}</p>
                    <p style={{ fontSize: "11.5px", color: "var(--c-text-secondary)", lineHeight: 1.5, marginTop: "2px" }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) {
          .responsive-auth-right {
            display: none !important;
          }
          .responsive-auth-left {
            flex: 1 !important;
            border-right: none !important;
            padding: 32px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
