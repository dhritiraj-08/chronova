"use client";

import { useEffect, useState } from "react";
import { Sparkles, Calendar, Clock, ShieldAlert, CheckCircle } from "lucide-react";

export function LandingHeroPreview() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { title: "Analyzing load...", desc: "Reading subject priorities & sleep windows" },
    { title: "Optimizing flow...", desc: "Balancing heavy study blocks with breaks" },
    { title: "Enforcing recovery...", desc: "Blocking out mandatory sleep & recreation time" },
    { title: "Schedule Ready!", desc: "Intelligent timetable generated successfully" },
  ];

  return (
    <div style={{
      position: "relative",
      width: "100%",
      maxWidth: "1000px",
      margin: "48px auto 0",
      background: "linear-gradient(180deg, var(--c-surface-1) 0%, var(--c-surface-0) 100%)",
      border: "1px solid var(--c-border-1)",
      borderRadius: "16px",
      boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--c-accent-border)",
      overflow: "hidden",
      padding: "20px",
      textAlign: "left"
    }}>
      {/* Chrome window header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: "16px",
        borderBottom: "1px solid var(--c-border-0)",
        marginBottom: "20px"
      }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#fbbf24" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e" }} />
        </div>
        <div style={{
          background: "var(--c-surface-2)",
          padding: "4px 32px",
          borderRadius: "6px",
          fontSize: "11px",
          color: "var(--c-text-tertiary)",
          fontFamily: "var(--font-inter)",
          border: "1px solid var(--c-border-0)",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--c-accent)" }} />
          app.chronova.ai/dashboard
        </div>
        <div style={{ width: "42px" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "20px" }} className="responsive-preview-grid">
        {/* Mock Sidebar */}
        <div style={{
          borderRight: "1px solid var(--c-border-0)",
          paddingRight: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }} className="mock-sidebar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "var(--c-accent)", display: "flex", alignItems: "center", justifyItems: "center" }} />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--c-text-primary)" }}>Chronova AI</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {["Dashboard", "Calendar", "AI Coach", "Analytics", "Settings"].map((item, i) => (
              <div key={item} style={{
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                background: i === 0 ? "var(--c-surface-2)" : "transparent",
                border: i === 0 ? "1px solid var(--c-border-0)" : "1px solid transparent",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: i === 0 ? "var(--c-accent)" : "var(--c-text-tertiary)", opacity: 0.7 }} />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Mock Content */}
        <div>
          {/* Top Status Bar */}
          <div style={{
            background: "var(--c-accent-dim)",
            border: "1px solid var(--c-accent-border)",
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "all 0.5s ease"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {activeStep === 3 ? (
                <CheckCircle size={15} color="#22c55e" />
              ) : (
                <Sparkles size={15} color="var(--c-accent)" className="spin" />
              )}
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--c-text-primary)" }}>
                  {steps[activeStep].title}
                </p>
                <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", marginTop: "2px" }}>
                  {steps[activeStep].desc}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                background: "var(--c-surface-2)",
                height: "6px",
                width: "80px",
                borderRadius: "3px",
                overflow: "hidden"
              }}>
                <div style={{
                  background: "var(--c-accent)",
                  height: "100%",
                  width: `${(activeStep + 1) * 25}%`,
                  transition: "width 0.5s ease"
                }} />
              </div>
              <span style={{ fontSize: "11px", color: "#2563EB", fontWeight: 600 }}>
                {Math.round((activeStep + 1) * 25)}%
              </span>
            </div>
          </div>

          {/* Timetable visual simulation */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {/* Mon */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--c-text-tertiary)", paddingLeft: "4px" }}>Monday</p>
              
              <div style={{
                background: "var(--c-surface-1)",
                border: "1px solid var(--c-border-0)",
                borderRadius: "10px",
                padding: "12px",
                opacity: activeStep >= 0 ? 1 : 0.2,
                transform: activeStep >= 0 ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.5s ease"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>Mathematics</span>
                  <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "999px", background: "var(--c-accent-dim)", color: "#2563EB" }}>Study</span>
                </div>
                <span style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)" }}>07:00 – 08:30</span>
              </div>

              <div style={{
                background: "var(--c-surface-1)",
                border: "1px solid var(--c-border-0)",
                borderRadius: "10px",
                padding: "12px",
                opacity: activeStep >= 1 ? 1 : 0.2,
                transform: activeStep >= 1 ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.5s ease"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>College Classes</span>
                  <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "999px", background: "rgba(56,189,248,0.1)", color: "#0369A1" }}>Class</span>
                </div>
                <span style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)" }}>09:00 – 15:00</span>
              </div>

              <div style={{
                background: "rgba(34, 197, 94, 0.05)",
                border: "1px dashed rgba(34, 197, 94, 0.3)",
                borderRadius: "10px",
                padding: "12px",
                opacity: activeStep >= 2 ? 1 : 0.2,
                transform: activeStep >= 2 ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.5s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <Clock size={12} color="#15803D" />
                <div>
                  <p style={{ fontSize: "11.5px", fontWeight: 600, color: "#15803D" }}>Mindful Break</p>
                  <p style={{ fontSize: "10px", color: "var(--c-text-tertiary)" }}>15:00 – 15:30</p>
                </div>
              </div>
            </div>

            {/* Tue */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--c-text-tertiary)", paddingLeft: "4px" }}>Tuesday</p>

              <div style={{
                background: "var(--c-surface-1)",
                border: "1px solid var(--c-border-0)",
                borderRadius: "10px",
                padding: "12px",
                opacity: activeStep >= 1 ? 1 : 0.2,
                transform: activeStep >= 1 ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.5s ease"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>Physics</span>
                  <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "999px", background: "var(--c-accent-dim)", color: "#2563EB" }}>Study</span>
                </div>
                <span style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)" }}>07:00 – 08:30</span>
              </div>

              <div style={{
                background: "var(--c-surface-1)",
                border: "1px solid var(--c-border-0)",
                borderRadius: "10px",
                padding: "12px",
                opacity: activeStep >= 1 ? 1 : 0.2,
                transform: activeStep >= 1 ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.5s ease"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>College Classes</span>
                  <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "999px", background: "rgba(56,189,248,0.1)", color: "#0369A1" }}>Class</span>
                </div>
                <span style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)" }}>09:00 – 15:00</span>
              </div>

              <div style={{
                background: "var(--c-surface-1)",
                border: "1px solid var(--c-border-0)",
                borderRadius: "10px",
                padding: "12px",
                opacity: activeStep >= 2 ? 1 : 0.2,
                transform: activeStep >= 2 ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.5s ease"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>Chemistry</span>
                  <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "999px", background: "var(--c-accent-dim)", color: "#2563EB" }}>Study</span>
                </div>
                <span style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)" }}>15:30 – 17:00</span>
              </div>
            </div>

            {/* Wed */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--c-text-tertiary)", paddingLeft: "4px" }}>Wednesday</p>

              <div style={{
                background: "var(--c-surface-1)",
                border: "1px solid var(--c-border-0)",
                borderRadius: "10px",
                padding: "12px",
                opacity: activeStep >= 2 ? 1 : 0.2,
                transform: activeStep >= 2 ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.5s ease"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>Mathematics</span>
                  <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "999px", background: "var(--c-accent-dim)", color: "#2563EB" }}>Study</span>
                </div>
                <span style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)" }}>07:00 – 08:30</span>
              </div>

              <div style={{
                background: "var(--c-surface-1)",
                border: "1px solid var(--c-border-0)",
                borderRadius: "10px",
                padding: "12px",
                opacity: activeStep >= 2 ? 1 : 0.2,
                transform: activeStep >= 2 ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.5s ease"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>College Classes</span>
                  <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "999px", background: "rgba(56,189,248,0.1)", color: "#0369A1" }}>Class</span>
                </div>
                <span style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)" }}>09:00 – 15:00</span>
              </div>

              <div style={{
                background: "var(--c-accent-dim)",
                border: "1px dashed var(--c-accent-border)",
                borderRadius: "10px",
                padding: "12px",
                opacity: activeStep >= 3 ? 1 : 0.2,
                transform: activeStep >= 3 ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.5s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <ShieldAlert size={12} color="var(--c-accent)" />
                <div>
                  <p style={{ fontSize: "11.5px", fontWeight: 600, color: "#2563EB" }}>Rest (Protected)</p>
                  <p style={{ fontSize: "10px", color: "var(--c-text-tertiary)" }}>15:00 – 16:30</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative gradient border bottom */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "2px",
        background: "linear-gradient(90deg, transparent 15%, var(--c-accent) 50%, transparent 85%)",
        opacity: 0.6
      }} />

      <style jsx global>{`
        .spin {
          animation: spin-anim 2s linear infinite;
        }
        @keyframes spin-anim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .responsive-preview-grid {
            grid-template-columns: 1fr !important;
          }
          .mock-sidebar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
