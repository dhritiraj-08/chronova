"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight,
  Calendar, MessageCircle, ShieldCheck, BarChart2,
  CheckCircle2, Sparkles,
} from "lucide-react";
import { Logo } from "@/components/Logo";

const FEATURES = [
  { icon: Calendar, color: "#3B82F6", title: "A personalised weekly schedule", sub: "Built around your subjects, sleep, and college hours" },
  { icon: MessageCircle, color: "#8B5CF6", title: "AI chat that understands context", sub: "Say \"I'm tired\" — it adapts. Say \"exam in 3 days\" — it focuses." },
  { icon: ShieldCheck, color: "#10B981", title: "Burnout protection built in", sub: "Recovery windows are non-negotiable. Sleep is respected." },
  { icon: BarChart2, color: "#F97316", title: "Analytics that surface patterns", sub: "See your study hours, consistency, and goal progress weekly." },
];

const PREVIEW_SESSIONS = [
  { title: "Mathematics Focus", time: "7:00 – 8:30 AM", color: "#3B82F6", done: true },
  { title: "College Classes", time: "9:00 AM – 3:00 PM", color: "#1D4ED8", done: false },
  { title: "Physics Practice", time: "6:00 – 7:30 PM", color: "#7C3AED", done: false },
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
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
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to create account");
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

      // Everyone who self-signs up is a student — institution admins and
      // teachers are provisioned by an existing admin (via /admin/teachers),
      // never through this public form.
      router.push("/onboarding");
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
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", marginBottom: "40px" }}>
            <Logo size={24} />
          </Link>

          {/* Heading */}
          <div style={{ marginBottom: "24px" }}>
            <h1 className="font-display" style={{ fontSize: "27px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--c-text-primary)" }}>
              Create your account
            </h1>
            <p style={{ fontSize: "13.5px", color: "var(--c-text-secondary)", marginTop: "6px", lineHeight: 1.5 }}>
              Free to start, no credit card required — you'll have a real schedule in about three minutes.
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
              <label className="form-label" htmlFor="signup-name">Full name</label>
              <div className="input-group">
                <User size={14} className="input-icon" />
                <input id="signup-name" type="text" className="input" placeholder="Arjun Mehta"
                  value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="signup-email">Email</label>
              <div className="input-group">
                <Mail size={14} className="input-icon" />
                <input id="signup-email" type="email" className="input" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="signup-password">Password</label>
              <div className="input-group">
                <Lock size={14} className="input-icon" />
                <input id="signup-password" type={showPw ? "text" : "password"} className="input"
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
              id="signup-submit-btn"
              type="submit"
              disabled={loading || !email || !password || !name}
              className="btn btn-primary"
              style={{ width: "100%", padding: "11px", marginTop: "6px", justifyContent: "center", fontSize: "13.5px", fontWeight: 600 }}
            >
              {loading ? "Creating..." : <>Create account <ArrowRight size={13} style={{ marginLeft: "2px" }} /></>}
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
        </div>

        {/* Right panel (brand side) */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          padding: "48px", position: "relative", overflow: "hidden",
          background: "linear-gradient(165deg, var(--c-surface-0) 0%, var(--c-base) 60%)"
        }} className="responsive-auth-right">
          <div style={{ position: "relative", zIndex: 1, maxWidth: "440px", width: "100%" }}>

            <p className="eyebrow" style={{ marginBottom: "14px", justifyContent: "center", display: "flex" }}>
              A look at your new dashboard
            </p>

            {/* App preview mockup */}
            <div className="card" style={{ padding: "18px", boxShadow: "var(--sh-lg)", marginBottom: "28px" }}>
              {/* Chrome header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid var(--c-border-0)", marginBottom: "14px" }}>
                <div style={{ display: "flex", gap: "5px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
                </div>
                <div style={{ background: "var(--c-surface-2)", padding: "3px 20px", borderRadius: "6px", fontSize: "10px", color: "var(--c-text-tertiary)", border: "1px solid var(--c-border-0)" }}>
                  app.chronova.ai/dashboard
                </div>
                <div style={{ width: "24px" }} />
              </div>

              <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--c-text-primary)" }}>Good evening, Arjun 👋</p>
              <p style={{ fontSize: "11px", color: "var(--c-text-secondary)", marginBottom: "12px" }}>Here's today's focus</p>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {PREVIEW_SESSIONS.map((s) => (
                  <div key={s.title} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 10px", borderRadius: "8px", background: "var(--c-surface-0)",
                    borderLeft: `3px solid ${s.color}`
                  }}>
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>{s.title}</p>
                      <p style={{ fontSize: "10px", color: "var(--c-text-tertiary)" }}>{s.time}</p>
                    </div>
                    {s.done && <CheckCircle2 size={15} color="#15803D" />}
                  </div>
                ))}
              </div>

              {/* Mini AI chat snippet */}
              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--c-border-0)", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ alignSelf: "flex-end", background: "var(--c-surface-2)", color: "var(--c-text-primary)", padding: "6px 10px", borderRadius: "10px 10px 2px 10px", fontSize: "11px", maxWidth: "80%" }}>
                  I'm exhausted today 😩
                </div>
                <div style={{ alignSelf: "flex-start", display: "flex", gap: "6px", alignItems: "flex-start", maxWidth: "88%" }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "var(--c-accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                    <Sparkles size={10} color="var(--c-accent-dark)" />
                  </div>
                  <div style={{ background: "var(--c-accent-dim)", border: "1px solid var(--c-accent-border)", color: "var(--c-text-primary)", padding: "6px 10px", borderRadius: "10px 10px 10px 2px", fontSize: "11px" }}>
                    Got it — lightened tonight's load and moved Physics to tomorrow morning. Rest well 🌙
                  </div>
                </div>
              </div>
            </div>

            {/* Feature list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "20px" }}>
              {FEATURES.map(({ icon: Icon, color, title, sub }) => (
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
                  <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: `${color}18`, border: `1px solid ${color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={14} color={color} />
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
                Trusted by <strong style={{ color: "var(--c-text-primary)" }}>50,000+ students</strong> and <strong style={{ color: "var(--c-text-primary)" }}>2,100 schools</strong>
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
