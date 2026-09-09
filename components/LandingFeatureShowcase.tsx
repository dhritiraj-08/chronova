"use client";

import { MessageSquare, ShieldCheck, BarChart3, Building2, CalendarRange } from "lucide-react";

export function LandingFeatureShowcase() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(12, 1fr)",
      gap: "20px",
      marginTop: "48px"
    }} className="bento-grid">
      
      {/* 1. AI Chat Assistant Card (8 cols) */}
      <div style={{
        gridColumn: "span 8",
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "360px",
      }}
      className="bento-card card card-hover"
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--c-accent-dim)", border: "1px solid var(--c-accent-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageSquare size={16} color="var(--c-accent-light)" />
            </div>
            <h4 style={{ fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-display)" }}>Conversational AI Coach</h4>
          </div>
          <p style={{ fontSize: "13.5px", color: "var(--c-text-secondary)", lineHeight: 1.6, maxWidth: "520px" }}>
            Chronova makes calendar management conversational. Chat with your AI mentor to swap subjects, request lighter days, or accommodate sudden exam notices.
          </p>
        </div>

        {/* Chat Mockup */}
        <div style={{
          background: "rgba(8, 9, 15, 0.6)",
          border: "1px solid var(--c-border-1)",
          borderRadius: "12px",
          padding: "16px",
          marginTop: "20px",
          fontFamily: "var(--font-inter)",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          <div style={{ alignSelf: "flex-end", background: "#2563EB", color: "white", padding: "8px 14px", borderRadius: "12px 12px 2px 12px", fontSize: "12.5px", maxWidth: "80%", boxShadow: "0 4px 12px var(--c-accent-glow)" }}>
            I missed my Physics slot today and I have a chemistry test tomorrow. What do I do?
          </div>
          <div style={{ alignSelf: "flex-start", background: "var(--c-surface-1)", border: "1px solid var(--c-border-1)", color: "var(--c-text-primary)", padding: "12px 16px", borderRadius: "12px 12px 12px 2px", fontSize: "12.5px", maxWidth: "85%", display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "16px", marginTop: "-2px" }}>🤖</span>
            <div>
              <p style={{ fontWeight: 700, color: "#2563EB", marginBottom: "3px" }}>Coach</p>
              <p style={{ color: "var(--c-text-secondary)", lineHeight: 1.55 }}>
                Understood. I've automatically postponed today's Physics session to Friday afternoon. Tonight's slots have been swapped entirely to Chemistry focus with a built-in active recall quiz slot.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Burnout Protection Card (4 cols) */}
      <div style={{
        gridColumn: "span 4",
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "360px",
      }}
      className="bento-card card-paper card-paper-hover"
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(6, 182, 212, 0.12)", border: "1px solid rgba(6, 182, 212, 0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={16} color="var(--c-secondary)" />
            </div>
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--c-text-paper)", fontFamily: "var(--font-display)" }}>Burnout Prevention</h4>
          </div>
          <p style={{ fontSize: "13.5px", color: "#374151", lineHeight: 1.6 }}>
            Chronova enforces cognitive breathing room. It halts continuous 4+ hour study blocks and reserves recovery buffers.
          </p>
        </div>

        {/* Burnout Mockup */}
        <div style={{
          background: "#ffffff",
          border: "1px solid rgba(12,13,18,0.08)",
          borderRadius: "12px",
          padding: "20px",
          marginTop: "20px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: 800, color: "var(--c-secondary-dark)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>94%</div>
          <p style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", marginTop: "4px" }}>Wellness Index</p>
          
          <div style={{
            background: "rgba(6, 182, 212, 0.06)",
            border: "1px dashed rgba(6, 182, 212, 0.3)",
            borderRadius: "6px",
            padding: "8px",
            fontSize: "11px",
            color: "var(--c-secondary-dark)",
            marginTop: "14px",
            fontWeight: 600
          }}>
            Protected sleep & rest slots preserved
          </div>
        </div>
      </div>

      {/* 3. Deep Analytics Card (5 cols) */}
      <div style={{
        gridColumn: "span 5",
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "360px",
      }}
      className="bento-card card card-hover"
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--c-secondary-dim)", border: "1px solid var(--c-secondary-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart3 size={16} color="var(--c-secondary-light)" />
            </div>
            <h4 style={{ fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-display)" }}>Performance Analytics</h4>
          </div>
          <p style={{ fontSize: "13.5px", color: "var(--c-text-secondary)", lineHeight: 1.6 }}>
            Understand your focus metrics, syllabus progress percentages, and weekly consistency ratings in a clean, visual format.
          </p>
        </div>

        {/* Analytics Mockup */}
        <div style={{
          background: "rgba(8, 9, 15, 0.6)",
          border: "1px solid var(--c-border-1)",
          borderRadius: "12px",
          padding: "18px",
          marginTop: "20px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "rgba(255,255,255,0.65)", marginBottom: "8px" }}>
            <span>Weekly Study Hours</span>
            <span style={{ fontWeight: 700, color: "var(--c-accent-light)" }}>28.5h / 30h</span>
          </div>
          <div style={{ background: "var(--c-surface-3)", height: "8px", borderRadius: "4px", overflow: "hidden", marginBottom: "16px" }}>
            <div style={{ background: "linear-gradient(90deg, var(--c-accent), var(--c-secondary))", height: "100%", width: "95%" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "rgba(255,255,255,0.65)" }}>
            <span>Syllabus Covered</span>
            <span style={{ fontWeight: 700, color: "var(--c-secondary-light)" }}>72%</span>
          </div>
        </div>
      </div>

      {/* 4. Adaptive Institution Scheduling (7 cols) */}
      <div style={{
        gridColumn: "span 7",
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "360px",
      }}
      className="bento-card card card-hover"
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--c-orange-dim)", border: "1px solid var(--c-orange-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={16} color="var(--c-orange)" />
            </div>
            <h4 style={{ fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-display)" }}>For Schools & Universities</h4>
          </div>
          <p style={{ fontSize: "13.5px", color: "var(--c-text-secondary)", lineHeight: 1.6 }}>
            Chronova handles massive institutional structures. Generate complex, conflict-free schedules for thousands of students and teachers while respecting availability restrictions.
          </p>
        </div>

        {/* Institution Mockup */}
        <div style={{
          background: "rgba(8, 9, 15, 0.6)",
          border: "1px solid var(--c-border-1)",
          borderRadius: "12px",
          padding: "16px",
          marginTop: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", borderBottom: "1px solid var(--c-border-1)", paddingBottom: "8px" }}>
            <span style={{ color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>Batch 12-A Timetable</span>
            <span style={{ color: "var(--c-success)", fontWeight: 700, fontSize: "11.5px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--c-success)", display: "inline-block", boxShadow: "0 0 8px var(--c-success)" }} />
              Conflict free
            </span>
          </div>
          
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ flex: 1, background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", borderRadius: "8px", padding: "8px 10px", fontSize: "11px" }}>
              <p style={{ fontWeight: 600, color: "var(--c-text-primary)" }}>Period 1</p>
              <p style={{ color: "var(--c-text-secondary)", marginTop: "2px" }}>Math · Rm 104</p>
            </div>
            <div style={{ flex: 1, background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", borderRadius: "8px", padding: "8px 10px", fontSize: "11px" }}>
              <p style={{ fontWeight: 600, color: "var(--c-text-primary)" }}>Period 2</p>
              <p style={{ color: "var(--c-text-secondary)", marginTop: "2px" }}>Physics · Lab A</p>
            </div>
            <div style={{ flex: 1, background: "var(--c-surface-2)", border: "1px dashed var(--c-border-2)", borderRadius: "8px", padding: "8px 10px", fontSize: "11px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <p style={{ fontWeight: 600, color: "#1D4ED8" }}>Break</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) {
          .bento-grid {
            display: flex !important;
            flex-direction: column !important;
          }
          .bento-card {
            grid-column: span 12 !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
