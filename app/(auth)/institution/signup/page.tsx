"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight, Building2,
  Users, BarChart3, ShieldCheck, CalendarCheck, CheckCircle2,
} from "lucide-react";
import { Logo } from "@/components/Logo";

const FEATURES = [
  { icon: CalendarCheck, title: "One-click AI timetable generation", sub: "Feed in teachers, subjects, and rooms — get a conflict-free weekly timetable in seconds." },
  { icon: ShieldCheck, title: "Automatic conflict detection", sub: "Teacher clashes, room overlaps, and workload imbalances flagged before they happen." },
  { icon: Users, title: "Teacher & classroom management", sub: "Invite teachers, assign classrooms and batches, and manage availability from one place." },
  { icon: BarChart3, title: "Institution-wide analytics", sub: "See attendance, workload distribution, and request trends across every batch." },
];

// This is a distinct portal from student signup — one email can only ever
// belong to one portal (see /api/auth/signup), so this page exists
// separately rather than as a tab on /signup.
export default function InstitutionSignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [institutionName, setInstitutionName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dashboard");
      }
    });
  }, [router, supabase]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setErrorCode(undefined);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: adminName,
          role: "institution",
          institutionName,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to create institution account");
        setErrorCode(data.code);
        setLoading(false);
        return;
      }

      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
      if (loginErr) {
        setError("Account created, but could not log in automatically. Please try signing in.");
        setLoading(false);
        return;
      }

      // /login resolves role via resolveUserRole() and sends admins to
      // /admin — there's no separate institution login page (see AGENTS
      // notes on lib/auth/resolveRole.ts), so this is the right redirect.
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }} className="page-bg animate-fade">
      <div className="page-content" style={{ display: "flex", width: "100%", minHeight: "100vh" }}>

        {/* Left panel (form side) */}
        <div style={{
          flex: "0 0 440px",
          display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "48px 44px",
          borderRight: "1px solid var(--c-border-1)",
          background: "var(--c-surface-0)",
          position: "relative",
          zIndex: 10
        }} className="responsive-auth-left">

          {/* Logo */}
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", marginBottom: "32px" }}>
            <Logo size={24} />
          </Link>

          {/* Heading */}
          <div style={{ marginBottom: "24px" }}>
            <span className="badge badge-secondary" style={{ padding: "4px 10px", fontSize: "10.5px", border: "1px solid var(--c-secondary-border)", marginBottom: "12px", display: "inline-flex" }}>
              <Building2 size={11} style={{ marginRight: "3px" }} /> Institution Portal
            </span>
            <h1 className="font-display" style={{ fontSize: "27px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--c-text-primary)" }}>
              Set up your institution
            </h1>
            <p style={{ fontSize: "13.5px", color: "var(--c-text-secondary)", marginTop: "6px", lineHeight: 1.5 }}>
              Bring AI-powered timetabling and teacher management to your school or coaching center.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {error && (
              <div className="alert alert-error" style={{ padding: "8px 12px", fontSize: "12px", lineHeight: 1.5 }}>
                {errorCode === "email_exists" ? (
                  <span>
                    {error} Already have an account?{" "}
                    <Link href="/login" style={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }}>
                      Sign in instead
                    </Link>.
                  </span>
                ) : (
                  <span>{error}</span>
                )}
              </div>
            )}

            <div>
              <label className="form-label" htmlFor="inst-signup-name">Institution name</label>
              <div className="input-group">
                <Building2 size={14} className="input-icon" />
                <input id="inst-signup-name" type="text" className="input" placeholder="e.g. Rungta College of Science"
                  value={institutionName} onChange={e => setInstitutionName(e.target.value)} required autoComplete="organization" />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="inst-signup-admin-name">Admin name</label>
              <div className="input-group">
                <User size={14} className="input-icon" />
                <input id="inst-signup-admin-name" type="text" className="input" placeholder="Dr. Kavita Rao"
                  value={adminName} onChange={e => setAdminName(e.target.value)} required autoComplete="name" />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="inst-signup-email">Email</label>
              <div className="input-group">
                <Mail size={14} className="input-icon" />
                <input id="inst-signup-email" type="email" className="input" placeholder="admin@yourinstitution.edu"
                  value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="inst-signup-password">Password</label>
              <div className="input-group">
                <Lock size={14} className="input-icon" />
                <input id="inst-signup-password" type={showPw ? "text" : "password"} className="input"
                  placeholder="At least 8 characters"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required minLength={8} autoComplete="new-password"
                  style={{ paddingRight: "36px" }} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", display: "flex" }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              id="institution-signup-submit-btn"
              type="submit"
              disabled={loading || !email || !password || !adminName || !institutionName}
              className="btn btn-primary"
              style={{ width: "100%", padding: "11px", marginTop: "6px", justifyContent: "center", fontSize: "13.5px", fontWeight: 600, background: "var(--c-secondary)", borderColor: "var(--c-secondary)" }}
            >
              {loading ? "Setting up..." : <>Create institution account <ArrowRight size={13} style={{ marginLeft: "2px" }} /></>}
            </button>
          </form>

          <p style={{ marginTop: "18px", fontSize: "11px", color: "var(--c-text-tertiary)", textAlign: "center", lineHeight: 1.5 }}>
            By creating an account you agree to our{" "}
            <Link href="/terms" style={{ color: "var(--c-text-secondary)", textDecoration: "underline" }}>Terms</Link>{" "}and{" "}
            <Link href="/privacy" style={{ color: "var(--c-text-secondary)", textDecoration: "underline" }}>Privacy Policy</Link>.
          </p>

          <p style={{ marginTop: "22px", fontSize: "12.5px", color: "var(--c-text-tertiary)", textAlign: "center" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--c-text-primary)", textDecoration: "none", fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
          <p style={{ marginTop: "6px", fontSize: "12.5px", color: "var(--c-text-tertiary)", textAlign: "center" }}>
            Not an institution?{" "}
            <Link href="/signup" style={{ color: "var(--c-text-primary)", textDecoration: "none", fontWeight: 500 }}>
              Sign up as a student
            </Link>
          </p>
        </div>

        {/* Right panel (brand side) */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          padding: "48px", position: "relative", overflow: "hidden",
          background: "linear-gradient(165deg, var(--c-surface-0) 0%, var(--c-base) 60%)"
        }} className="responsive-auth-right">
          <div style={{ position: "relative", zIndex: 1, maxWidth: "440px", width: "100%" }}>

            <p className="eyebrow" style={{ marginBottom: "14px", justifyContent: "center", display: "flex" }}>
              Built for schools, colleges & coaching centers
            </p>

            {/* Admin dashboard preview mockup */}
            <div className="card" style={{ padding: "18px", boxShadow: "var(--sh-lg)", marginBottom: "28px" }}>
              {/* Chrome header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid var(--c-border-0)", marginBottom: "14px" }}>
                <div style={{ display: "flex", gap: "5px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
                </div>
                <div style={{ background: "var(--c-surface-2)", padding: "3px 20px", borderRadius: "6px", fontSize: "10px", color: "var(--c-text-tertiary)", border: "1px solid var(--c-border-0)" }}>
                  app.chronova.ai/admin
                </div>
                <div style={{ width: "24px" }} />
              </div>

              <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--c-text-primary)" }}>Rungta College of Science</p>
              <p style={{ fontSize: "11px", color: "var(--c-text-secondary)", marginBottom: "12px" }}>18 batches · 42 teachers · timetable synced</p>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  { title: "Grade 12 — Physics", time: "Mon–Fri · 9:00–10:00 AM", color: "#3B82F6" },
                  { title: "Grade 11 — Chemistry Lab", time: "Tue & Thu · 1:00–3:00 PM", color: "#7C3AED" },
                  { title: "Faculty Meeting", time: "Fri · 4:00 PM", color: "#F97316" },
                ].map((s) => (
                  <div key={s.title} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 10px", borderRadius: "8px", background: "var(--c-surface-0)",
                    borderLeft: `3px solid ${s.color}`
                  }}>
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>{s.title}</p>
                      <p style={{ fontSize: "10px", color: "var(--c-text-tertiary)" }}>{s.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Conflict-free badge */}
              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--c-border-0)", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "var(--c-success-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <CheckCircle2 size={12} color="var(--c-success)" />
                </div>
                <span style={{ fontSize: "11.5px", color: "var(--c-text-secondary)" }}>0 conflicts detected across the week</span>
              </div>
            </div>

            {/* Feature list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "20px" }}>
              {FEATURES.map(({ icon: Icon, title, sub }) => (
                <div key={title} style={{
                  display: "flex", gap: "12px", alignItems: "flex-start",
                  padding: "10px 12px", borderRadius: "var(--r-md)",
                  border: "1px solid transparent", transition: "all var(--t-fast)", cursor: "default"
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "var(--c-surface-1)";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--c-border-1)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                  }}
                >
                  <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: "var(--c-secondary-dim)", border: "1px solid var(--c-secondary-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={14} color="var(--c-secondary)" />
                  </div>
                  <div>
                    <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>{title}</p>
                    <p style={{ fontSize: "11.5px", color: "var(--c-text-secondary)", lineHeight: 1.5, marginTop: "2px" }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust signal */}
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--c-success)", flexShrink: 0 }} />
              <p style={{ fontSize: "12px", color: "var(--c-text-secondary)" }}>
                Trusted by <strong style={{ color: "var(--c-text-primary)" }}>2,100+ institutions</strong> to build conflict-free timetables
              </p>
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
