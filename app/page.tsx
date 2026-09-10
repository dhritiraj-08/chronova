"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import { LandingHeroPreview } from "@/components/LandingHeroPreview";
import { LandingTimetableDemo } from "@/components/LandingTimetableDemo";
import { LandingHowItWorks } from "@/components/LandingHowItWorks";
import { LandingFeatureShowcase } from "@/components/LandingFeatureShowcase";
import {
  ArrowRight, CheckCircle, ChevronRight,
  Sparkles, Calendar, MessageCircle, BarChart2,
  Building, Shield, Zap, Moon, Target,
  Users, BookOpen, Star, Clock, Play
} from "lucide-react";

/* ─── Static Data ─── */

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Interactive Demo", href: "#demo" },
  { label: "How it works", href: "#how" },
  { label: "Testimonials", href: "#testimonials" },
];

const TESTIMONIALS = [
  {
    body: "I used to rewrite my schedule every Sunday. Now Chronova does it for me — and honestly does it better. My study hours went up 40% in six weeks.",
    author: "Arjun M.",
    role: "JEE Aspirant, Delhi",
    rating: 5,
  },
  {
    body: "We needed to generate conflict-free timetables for 1,200 students across 18 batches. What used to take three days now takes four minutes.",
    author: "Dr. Kavita Rao",
    role: "Principal, Rungta College",
    rating: 5,
  },
  {
    body: "The burnout detection is what got me. It noticed I'd been overloading Thursday nights and blocked two hours of recovery time without me asking.",
    author: "Priya S.",
    role: "UPSC Aspirant, Bangalore",
    rating: 5,
  },
];

const STATS = [
  { value: "50K+", label: "Students scheduled" },
  { value: "2,100+", label: "Institutions served" },
  { value: "94%", label: "Better grades reported" },
  { value: "4.9★", label: "Average rating" },
];

const INSTITUTION_FEATURES = [
  { icon: Building, title: "One-click AI Timetable", desc: "Input your teachers, subjects, rooms, and constraints. Get a fully optimised, conflict-free timetable in seconds." },
  { icon: Shield, title: "Conflict Detection", desc: "Automatic detection of teacher clashes, room overlaps, and period imbalances — with suggested resolutions." },
  { icon: Users, title: "Teacher Availability Management", desc: "Define per-teacher working days, subject preferences, and max periods. Chronova respects every constraint." },
  { icon: BookOpen, title: "Pedagogical Intelligence", desc: "Heavier subjects placed in morning slots, labs given adequate time, and workloads distributed evenly across the week." },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div style={{ minHeight: "100vh" }} className="page-bg">
      <div className="page-content">

        {/* ──────────────── NAV ──────────────── */}
        <header style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          height: "56px",
          display: "flex", alignItems: "center",
          borderBottom: scrolled ? "1px solid var(--c-border-1)" : "1px solid transparent",
          background: scrolled ? "rgba(253, 251, 247, 0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(8px)" : "none",
          transition: "all var(--t-fast)",
        }}>
          <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            {/* Logo */}
            <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              <Logo size={24} />
            </Link>

            {/* Nav links */}
            <nav style={{ display: "flex", gap: "2px" }} className="desktop-only-nav">
              {NAV_LINKS.map(l => (
                <a key={l.label} href={l.href} className="btn btn-ghost" style={{ fontSize: "12.5px", fontWeight: 500, padding: "6px 10px" }}>{l.label}</a>
              ))}
              <Link href="/institution/signup" className="btn btn-ghost" style={{ fontSize: "12.5px", fontWeight: 500, padding: "6px 10px" }}>For Institutions</Link>
            </nav>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Link href="/login"><button className="btn btn-ghost" style={{ fontSize: "12.5px", fontWeight: 500, padding: "6px 10px" }}>Sign in</button></Link>
              <Link href="/signup">
                <button className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 12px" }}>
                  Get Started <ArrowRight size={13} style={{ marginLeft: "2px" }} />
                </button>
              </Link>
            </div>
          </div>
        </header>

        {/* ──────────────── HERO ──────────────── */}
        <section style={{ paddingTop: "140px", paddingBottom: "80px", textAlign: "center" }}>
          <div className="container-sm">
            {/* Eyebrow */}
            <div className="animate-up" style={{ marginBottom: "20px" }}>
              <span className="badge badge-secondary" style={{ padding: "4px 10px", fontSize: "11px", border: "1px solid var(--c-secondary-border)" }}>
                <Sparkles size={11} style={{ marginRight: "3px" }} /> Powered by AI
              </span>
            </div>

            {/* Headline */}
            <h1 className="animate-up-1 font-display" style={{
              fontSize: "clamp(36px, 6vw, 68px)",
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              marginBottom: "20px",
              color: "var(--c-text-primary)"
            }}>
              Study smarter,{" "}
              <span className="headline-gradient" style={{ fontStyle: "italic", fontWeight: 400 }}>sleep better,</span>{" "}
              <br />and actually achieve.
            </h1>

            {/* Sub */}
            <p className="animate-up-2" style={{
              fontSize: "15px",
              color: "var(--c-text-secondary)",
              lineHeight: 1.6,
              maxWidth: "460px",
              margin: "0 auto 32px",
            }}>
              Chronova is an AI that understands your life — not just your syllabus.
              It builds, adapts, and defends your schedule so you can focus on the work.
            </p>

            {/* CTAs */}
            <div className="animate-up-3" style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginBottom: "16px" }}>
              <Link href="/signup">
                <button id="hero-start-btn" className="btn btn-primary" style={{ padding: "10px 20px", fontSize: "13px" }}>
                  Start for Free <ArrowRight size={14} style={{ marginLeft: "2px" }} />
                </button>
              </Link>
              <a href="#demo">
                <button className="btn btn-secondary" style={{ padding: "10px 20px", borderRadius: "var(--r-md)", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Play size={12} fill="currentColor" /> See Sandbox Demo
                </button>
              </a>
            </div>

            <p className="animate-up-4" style={{ fontSize: "11px", color: "var(--c-text-tertiary)", fontWeight: 500 }}>
              Free to start · No credit card required · AI active
            </p>
          </div>

          {/* Immersive Mockup Wrapper */}
          <div className="container animate-up-4" style={{ position: "relative", marginTop: "24px" }}>
            <LandingHeroPreview />
          </div>

          {/* Stats grid */}
          <div className="container animate-up-4" style={{ marginTop: "64px" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px",
              maxWidth: "800px", margin: "0 auto"
            }} className="responsive-stats-grid">
              {STATS.map(({ value, label }) => (
                <div key={label} className="card" style={{ padding: "20px 16px", textAlign: "center" }}>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 600, color: "var(--c-text-primary)", letterSpacing: "-0.015em" }}>{value}</p>
                  <p style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.02em", marginTop: "4px" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────── FEATURES ──────────────── */}
        <section id="features" style={{ padding: "80px 0", borderTop: "1px solid var(--c-border-1)" }}>
          <div className="container">
            {/* Section header */}
            <div style={{ maxWidth: "480px", marginBottom: "36px" }}>
              <span className="eyebrow" style={{ marginBottom: "12px", display: "flex" }}>For Students</span>
              <h2 className="font-display" style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "12px" }}>
                Your schedule, finally as smart as you are.
              </h2>
              <p style={{ fontSize: "13.5px", color: "var(--c-text-secondary)", lineHeight: 1.6 }}>
                Four core dimensions designed in tandem to give you back your study rhythm, focus, and confidence.
              </p>
            </div>

            {/* Bento-grid showcase */}
            <LandingFeatureShowcase />
          </div>
        </section>

        {/* ──────────────── HOW IT WORKS ──────────────── */}
        <section id="how" style={{ padding: "80px 0", borderTop: "1px solid var(--c-border-1)" }}>
          <div className="container">
            <div style={{ textAlign: "center", maxWidth: "440px", margin: "0 auto 36px" }}>
              <span className="eyebrow" style={{ justifyContent: "center", marginBottom: "12px", display: "flex" }}>How It Works</span>
              <h2 className="font-display" style={{ fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                From zero to a complete plan in minutes
              </h2>
            </div>

            <LandingHowItWorks />
          </div>
        </section>

        {/* ──────────────── LIVE TIMETABLE DEMO ──────────────── */}
        <section id="demo" style={{ padding: "80px 0", borderTop: "1px solid var(--c-border-1)", background: "var(--c-surface-0)" }}>
          <div className="container">
            <div style={{ textAlign: "center", maxWidth: "520px", margin: "0 auto 48px" }}>
              <span className="eyebrow" style={{ justifyContent: "center", marginBottom: "12px", display: "flex" }}>Interactive Sandbox</span>
              <h2 className="font-display" style={{ fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                Experience the scheduling engine
              </h2>
              <p style={{ fontSize: "13.5px", color: "var(--c-text-secondary)", marginTop: "10px", lineHeight: 1.6 }}>
                Click the simulation actions below to observe how the AI dynamically handles subject prioritizing, cognitive breaks, and mental fatigue blocks.
              </p>
            </div>

            <LandingTimetableDemo />
          </div>
        </section>

        {/* ──────────────── INSTITUTIONS ──────────────── */}
        <section id="institutions" style={{ padding: "80px 0", borderTop: "1px solid var(--c-border-1)" }}>
          <div className="container">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "start" }} className="responsive-institutions-grid">
              {/* Left */}
              <div>
                <span className="eyebrow" style={{ marginBottom: "12px", display: "flex" }}>For Institutions</span>
                <h2 className="font-display" style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: "16px" }}>
                  Timetables that used to take days. Now take four minutes.
                </h2>
                <p style={{ fontSize: "13.5px", color: "var(--c-text-secondary)", lineHeight: 1.6, marginBottom: "24px" }}>
                  Chronova's institution engine takes your constraints — teachers, subjects, rooms, age groups — and produces a conflict-free, pedagogically sound timetable using AI.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
                  {["No more spreadsheet chaos", "Conflict detection built in", "Export-ready in one click", "Supports 50+ batches"].map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <CheckCircle size={14} color="var(--c-success)" />
                      <span style={{ fontSize: "13.5px", color: "var(--c-text-secondary)" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/institution/signup">
                  <button className="btn btn-primary" style={{ padding: "10px 20px" }}>
                    Try for your institution <ArrowRight size={14} style={{ marginLeft: "2px" }} />
                  </button>
                </Link>
              </div>

              {/* Right — feature list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "10px 6px", background: "var(--c-surface-1)", border: "1px solid var(--c-border-1)" }} className="card">
                {INSTITUTION_FEATURES.map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    style={{ padding: "12px 16px", borderRadius: "var(--r-md)", display: "flex", gap: "12px", alignItems: "flex-start", transition: "all var(--t-base)", cursor: "default" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "var(--c-surface-2)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <div style={{ width: "30px", height: "30px", borderRadius: "var(--r-md)", background: "var(--c-surface-2)", border: "1px solid var(--c-border-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={14} color="var(--c-text-secondary)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>{title}</p>
                      <p style={{ fontSize: "11.5px", color: "var(--c-text-secondary)", lineHeight: 1.5, marginTop: "2px" }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────── TESTIMONIALS ──────────────── */}
        <section id="testimonials" style={{ padding: "80px 0", borderTop: "1px solid var(--c-border-1)" }}>
          <div className="container">
            <div style={{ textAlign: "center", maxWidth: "440px", margin: "0 auto 48px" }}>
              <span className="eyebrow" style={{ justifyContent: "center", marginBottom: "12px", display: "flex" }}>Testimonials</span>
              <h2 className="font-display" style={{ fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                Students and schools that made the switch
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {TESTIMONIALS.map(({ body, author, role, rating }) => (
                <div key={author} className="card card-hover" style={{
                  padding: "24px",
                  display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px"
                }}>
                  <div>
                    <div style={{ display: "flex", gap: "3px", marginBottom: "12px" }}>
                      {Array.from({ length: rating }).map((_, i) => <Star key={i} size={12} fill="var(--c-orange)" color="var(--c-orange)" />)}
                    </div>
                    <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", lineHeight: 1.6, fontStyle: "italic" }}>"{body}"</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      background: "var(--c-surface-2)", border: "1px solid var(--c-border-2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)"
                    }}>
                      {author.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>{author}</p>
                      <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", marginTop: "2px", fontWeight: 500 }}>{role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────── CTA ──────────────── */}
        <section style={{ padding: "80px 0", borderTop: "1px solid var(--c-border-1)" }}>
          <div className="container-sm" style={{ textAlign: "center" }}>
            <span className="badge badge-orange" style={{ padding: "4px 12px", fontSize: "11px", marginBottom: "20px", display: "inline-flex" }}>
              <Clock size={11} style={{ marginRight: "3px" }} /> Free forever plan available
            </span>
            <h2 className="font-display" style={{
              fontSize: "clamp(28px, 4.5vw, 48px)",
              fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1,
              marginBottom: "16px"
            }}>
              Build the schedule you've
              <br />always needed.
            </h2>
            <p style={{ fontSize: "13.5px", color: "var(--c-text-secondary)", lineHeight: 1.6, marginBottom: "32px" }}>
              Join 50,000+ students and 2,100 institutions who stopped guessing
              <br />and started actually planning.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/signup">
                <button id="cta-start-btn" className="btn btn-primary" style={{ padding: "10px 20px" }}>
                  Create My Free Account <ArrowRight size={14} style={{ marginLeft: "2px" }} />
                </button>
              </Link>
              <Link href="/login">
                <button className="btn btn-secondary" style={{ padding: "10px 20px", borderRadius: "var(--r-md)", fontSize: "13px" }}>
                  Sign In Instead
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* ──────────────── FOOTER ──────────────── */}
        <footer style={{ borderTop: "1px solid var(--c-border-1)", background: "var(--c-surface-0)" }}>
          <div className="container" style={{ padding: "56px 0 28px" }}>
            <div
              style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: "32px", paddingBottom: "40px" }}
              className="footer-grid"
            >
              {/* Brand column */}
              <div>
                <Logo size={24} />
                <p style={{ fontSize: "13px", color: "var(--c-text-secondary)", lineHeight: 1.6, marginTop: "14px", maxWidth: "260px" }}>
                  The AI academic scheduler that understands your life, not just your syllabus.
                </p>
              </div>

              {/* Product column */}
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--c-text-tertiary)", marginBottom: "14px" }}>
                  Product
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {NAV_LINKS.map(l => (
                    <a key={l.label} href={l.href} style={{ fontSize: "13px", color: "var(--c-text-secondary)", textDecoration: "none" }}>
                      {l.label}
                    </a>
                  ))}
                  <Link href="/institution/signup" style={{ fontSize: "13px", color: "var(--c-text-secondary)", textDecoration: "none" }}>
                    For Institutions
                  </Link>
                </div>
              </div>

              {/* Company column */}
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--c-text-tertiary)", marginBottom: "14px" }}>
                  Company
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <Link href="/signup" style={{ fontSize: "13px", color: "var(--c-text-secondary)", textDecoration: "none" }}>Get Started</Link>
                  <Link href="/login" style={{ fontSize: "13px", color: "var(--c-text-secondary)", textDecoration: "none" }}>Sign In</Link>
                  <a href="mailto:support@chronova.ai" style={{ fontSize: "13px", color: "var(--c-text-secondary)", textDecoration: "none" }}>Contact</a>
                </div>
              </div>

              {/* Legal column */}
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--c-text-tertiary)", marginBottom: "14px" }}>
                  Legal
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <Link href="/privacy" style={{ fontSize: "13px", color: "var(--c-text-secondary)", textDecoration: "none" }}>Privacy Policy</Link>
                  <Link href="/terms" style={{ fontSize: "13px", color: "var(--c-text-secondary)", textDecoration: "none" }}>Terms of Service</Link>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", paddingTop: "24px", borderTop: "1px solid var(--c-border-1)" }}>
              <p style={{ fontSize: "12px", color: "var(--c-text-tertiary)", fontWeight: 500 }}>
                © 2026 Chronova AI · Built for students everywhere
              </p>
              <div style={{ display: "flex", gap: "4px" }}>
                <Link href="/privacy" className="btn btn-ghost" style={{ fontSize: "12px", padding: "4px 8px", fontWeight: 500 }}>Privacy</Link>
                <Link href="/terms" className="btn btn-ghost" style={{ fontSize: "12px", padding: "4px 8px", fontWeight: 500 }}>Terms</Link>
                <a href="mailto:support@chronova.ai" className="btn btn-ghost" style={{ fontSize: "12px", padding: "4px 8px", fontWeight: 500 }}>Contact</a>
              </div>
            </div>
          </div>
        </footer>

        <style jsx global>{`
          @media (max-width: 768px) {
            .desktop-only-nav {
              display: none !important;
            }
            .responsive-stats-grid {
              grid-template-columns: 1fr 1fr !important;
            }
            .responsive-institutions-grid {
              grid-template-columns: 1fr !important;
              gap: 30px !important;
            }
          }
          @media (max-width: 700px) {
            .footer-grid {
              grid-template-columns: 1fr 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
