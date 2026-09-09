import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Chronova AI",
};

const SECTIONS = [
  {
    title: "1. What we collect",
    body: [
      "Account information: your name, email address, and password (stored securely and never in plain text).",
      "Academic profile: subjects, difficulty levels, sleep schedule, college/class hours, and goals you enter during onboarding or in Settings.",
      "Schedule data: study sessions, exams, revision plans, completion status, and mood/focus check-ins you create or that Chronova generates for you.",
      "AI conversations: messages you send to the AI Academic Mentor, and the schedule context needed to answer them.",
      "Basic usage data: pages visited and actions taken within the app, used only to keep the product working and improve it.",
    ],
  },
  {
    title: "2. How we use it",
    body: [
      "To build and adapt your personalized study schedule.",
      "To power the AI Academic Mentor's answers and schedule suggestions.",
      "To show you your own progress, streaks, and analytics.",
      "To keep your account secure and support you if something goes wrong.",
      "We do not sell your personal data, and we do not use your academic data to train third-party AI models.",
    ],
  },
  {
    title: "3. Third-party services we use",
    body: [
      "Supabase: hosts our database and handles authentication. Your account and schedule data live here, protected by row-level security so only you can access your own records.",
      "An AI model provider (via OpenRouter): when you chat with the AI Academic Mentor, your message and relevant schedule context are sent to a third-party language model to generate a response. We don't send this content anywhere else.",
    ],
  },
  {
    title: "4. Data retention & deletion",
    body: [
      "We keep your data for as long as your account is active. You can request deletion of your account and associated data at any time from Settings, or by emailing us — see Contact below.",
    ],
  },
  {
    title: "5. Cookies",
    body: [
      "We use strictly necessary cookies to keep you signed in. We don't use third-party advertising or tracking cookies.",
    ],
  },
  {
    title: "6. Children's privacy",
    body: [
      "Chronova is built for students, including those under 18. If you're under the age required by your local law to consent to data processing on your own, please have a parent or guardian review this policy and set up your account with you.",
    ],
  },
  {
    title: "7. Security",
    body: [
      "Data is encrypted in transit. Database access is scoped per-user via row-level security policies, so one student's data is never visible to another.",
    ],
  },
  {
    title: "8. Changes to this policy",
    body: [
      "If we make material changes to how we handle your data, we'll update this page and, where appropriate, notify you in the app.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh" }} className="page-bg animate-fade">
      <div className="page-content">
        <header style={{ height: "64px", display: "flex", alignItems: "center", borderBottom: "1px solid var(--c-border-1)" }}>
          <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              <Logo size={24} />
            </Link>
            <Link href="/" className="btn btn-ghost" style={{ fontSize: "12.5px", fontWeight: 500, padding: "6px 10px" }}>
              <ArrowLeft size={13} style={{ marginRight: "4px" }} /> Back to home
            </Link>
          </div>
        </header>

        <main className="container-sm" style={{ padding: "56px var(--sp-6) 80px" }}>
          <p className="eyebrow">Legal</p>
          <h1 className="font-display" style={{ fontSize: "32px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--c-text-primary)", marginTop: "8px" }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: "13px", color: "var(--c-text-secondary)", marginTop: "8px" }}>
            Last updated: September 2026
          </p>
          <p style={{ fontSize: "14px", color: "var(--c-text-secondary)", lineHeight: 1.7, marginTop: "20px" }}>
            This policy explains what data Chronova AI collects, why, and how it's protected. We keep it simple:
            we only collect what's needed to build your schedule and run the AI Academic Mentor, and we never sell
            your data.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "28px", marginTop: "36px" }}>
            {SECTIONS.map(({ title, body }) => (
              <section key={title}>
                <h2 className="font-display" style={{ fontSize: "17px", fontWeight: 600, color: "var(--c-text-primary)", marginBottom: "10px" }}>
                  {title}
                </h2>
                <ul style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "18px" }}>
                  {body.map((line, i) => (
                    <li key={i} style={{ fontSize: "13.5px", color: "var(--c-text-secondary)", lineHeight: 1.65 }}>
                      {line}
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="card" style={{ padding: "20px", marginTop: "8px" }}>
              <h2 className="font-display" style={{ fontSize: "17px", fontWeight: 600, color: "var(--c-text-primary)", marginBottom: "8px" }}>
                9. Contact
              </h2>
              <p style={{ fontSize: "13.5px", color: "var(--c-text-secondary)", lineHeight: 1.65 }}>
                Questions about your data, or want it deleted? Email us at{" "}
                <a href="mailto:support@chronova.ai" style={{ color: "var(--c-accent-dark)", textDecoration: "underline" }}>
                  support@chronova.ai
                </a>.
              </p>
            </section>
          </div>
        </main>

        <footer style={{ borderTop: "1px solid var(--c-border-1)", padding: "24px 0", background: "var(--c-surface-0)" }}>
          <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <Logo size={20} />
            <div style={{ display: "flex", gap: "4px" }}>
              <Link href="/privacy" className="btn btn-ghost" style={{ fontSize: "12px", padding: "4px 8px", fontWeight: 500 }}>Privacy</Link>
              <Link href="/terms" className="btn btn-ghost" style={{ fontSize: "12px", padding: "4px 8px", fontWeight: 500 }}>Terms</Link>
              <a href="mailto:support@chronova.ai" className="btn btn-ghost" style={{ fontSize: "12px", padding: "4px 8px", fontWeight: 500 }}>Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
