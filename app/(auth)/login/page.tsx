"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveUserRole, roleHomePath } from "@/lib/auth/resolveRole";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

// A single login page for both portals, chosen via the tab selector below —
// NOT auto-detected from the account's role. That's deliberate: the same
// email/account can be a student AND an institution admin/teacher
// independently, so which tab is selected when the form is submitted is
// what decides which experience they get this session.
//
// Student Portal: always lands on /dashboard, full stop — never checks or
// redirects based on institution_members role.
//
// Institution Portal: resolves the account's real institution role and
// sends them to /admin or /teacher; an account with no institution
// membership gets an inline "no institution account" message instead of
// being silently sent anywhere.
type Portal = "student" | "institution";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [portal, setPortal] = useState<Portal>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notInstitution, setNotInstitution] = useState(false);

  useEffect(() => {
    // Only auto-redirect an already-logged-in visitor for the student
    // portal (its destination never depends on role, so there's nothing to
    // resolve). On the institution tab we deliberately wait for an
    // explicit submit — silently redirecting on mount would mean the tab
    // choice never actually got a chance to matter.
    if (portal !== "student") return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push("/dashboard");
    });
  }, [portal, router, supabase]);

  async function handleAuthenticatedUser(user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>) {
    if (portal === "student") {
      router.push("/dashboard");
      return;
    }
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
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 600, letterSpacing: "-0.015em", color: "var(--c-text-primary)" }}>
              Welcome back
            </h1>
            <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "2px" }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* Portal selector tabs */}
          <div style={{ display: "flex", gap: "4px", background: "var(--c-surface-2)", borderRadius: "var(--r-md)", padding: "3px", border: "1px solid var(--c-border-1)", marginBottom: "20px" }}>
            {(["student", "institution"] as const).map(p => (
              <button
                type="button"
                key={p}
                onClick={() => { setPortal(p); setError(""); setNotInstitution(false); }}
                style={{
                  flex: 1, padding: "7px 12px", borderRadius: "var(--r-sm)", border: "none", cursor: "pointer",
                  fontSize: "12.5px", fontWeight: 500, transition: "all var(--t-fast)",
                  background: portal === p ? "var(--c-surface-3)" : "transparent",
                  color: portal === p ? "var(--c-text-primary)" : "var(--c-text-secondary)"
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)} Portal
              </button>
            ))}
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
              <label className="form-label" htmlFor="login-email">Email</label>
              <div className="input-group">
                <Mail size={14} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="input"
                  placeholder={portal === "institution" ? "you@school.edu" : "you@example.com"}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label className="form-label" htmlFor="login-password">Password</label>
                <a href="#" style={{ fontSize: "11.5px", color: "var(--c-text-secondary)", textDecoration: "none", fontWeight: 500 }}>Forgot password?</a>
              </div>
              <div className="input-group">
                <Lock size={14} className="input-icon" />
                <input
                  id="login-password"
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
              id="login-submit-btn"
              type="submit"
              disabled={loading || !email || !password}
              className="btn btn-primary"
              style={{ width: "100%", padding: "10px", marginTop: "4px", justifyContent: "center", fontSize: "13px" }}
            >
              {loading ? "Signing in..." : <>Sign in <ArrowRight size={13} style={{ marginLeft: "2px" }} /></>}
            </button>
          </form>

          <p style={{ marginTop: "24px", fontSize: "12.5px", color: "var(--c-text-tertiary)", textAlign: "center" }}>
            Don't have an account?{" "}
            <Link href="/signup" style={{ color: "var(--c-text-primary)", textDecoration: "none", fontWeight: 500 }}>
              Sign up free
            </Link>
          </p>
        </div>

        {/* Right panel */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center", padding: "48px",
          position: "relative", overflow: "hidden"
        }} className="responsive-auth-right">

          <div style={{ position: "relative", zIndex: 1, maxWidth: "420px", width: "100%" }}>
            {/* Quote card */}
            <div className="card" style={{
              padding: "24px",
              marginBottom: "16px"
            }}>
              <p style={{ fontSize: "15px", fontWeight: 400, lineHeight: 1.6, color: "var(--c-text-primary)", marginBottom: "20px", fontStyle: "italic" }}>
                {portal === "institution"
                  ? "“Generating a conflict-free timetable used to take our admin team a full weekend. Now it's minutes.”"
                  : "“I used to rewrite my schedule every Sunday. Now Chronova does it — and honestly does it better.”"}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>
                  {portal === "institution" ? "RS" : "AM"}
                </div>
                <div>
                  <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>
                    {portal === "institution" ? "Ritu Sharma" : "Arjun Mehta"}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", fontWeight: 500 }}>
                    {portal === "institution" ? "Vice Principal, Delhi Public School" : "JEE Aspirant · Delhi"}
                  </p>
                </div>
              </div>
            </div>

            {/* Mini stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {(portal === "institution"
                ? [
                    { value: "2,100+", label: "Schools trust us" },
                    { value: "Minutes", label: "To generate a timetable" },
                    { value: "0", label: "Scheduling conflicts" },
                    { value: "24/7", label: "In-app requests & notices" },
                  ]
                : [
                    { value: "50K+", label: "Active students" },
                    { value: "94%", label: "Report better grades" },
                    { value: "4.9★", label: "Average rating" },
                    { value: "2,100+", label: "Schools trust us" },
                  ]
              ).map(({ value, label }) => (
                <div key={label} className="card" style={{ padding: "12px 16px" }}>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 650, color: "var(--c-text-primary)", letterSpacing: "-0.015em", marginBottom: "2px" }}>{value}</p>
                  <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", fontWeight: 500 }}>{label}</p>
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
