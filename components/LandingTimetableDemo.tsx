"use client";

import { useState } from "react";
import { Sparkles, Brain, Moon, Zap, RefreshCw, CalendarRange, Info } from "lucide-react";

interface ScheduleBlock {
  id: string;
  name: string;
  time: string;
  type: "study" | "class" | "break" | "rest";
  color: string;
  height: number;
  opacity: number;
  yOffset: number;
}

export function LandingTimetableDemo() {
  const [demoState, setDemoState] = useState<"initial" | "generated" | "balanced" | "burnout">("initial");
  const [isSimulating, setIsSimulating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Click a simulation option to see the AI scheduler in action.");

  // Blocks definitions for each state
  const getBlocks = (): ScheduleBlock[] => {
    switch (demoState) {
      case "initial":
        return [
          { id: "1", name: "Empty Slot (Pending AI)", time: "08:00 – 10:00", type: "study", color: "var(--c-surface-2)", height: 60, opacity: 0.5, yOffset: 0 },
          { id: "2", name: "Empty Slot (Pending AI)", time: "10:15 – 12:15", type: "study", color: "var(--c-surface-2)", height: 60, opacity: 0.5, yOffset: 0 },
          { id: "3", name: "Empty Slot (Pending AI)", time: "13:00 – 15:00", type: "study", color: "var(--c-surface-2)", height: 60, opacity: 0.5, yOffset: 0 },
        ];
      case "generated":
        return [
          { id: "1", name: "Mathematics (High Priority)", time: "08:00 – 10:00", type: "study", color: "var(--c-accent)", height: 60, opacity: 1, yOffset: 0 },
          { id: "2", name: "Physics (Core Syllabus)", time: "10:15 – 12:15", type: "study", color: "var(--c-accent)", height: 60, opacity: 1, yOffset: 0 },
          { id: "3", name: "Chemistry (Concept Study)", time: "13:00 – 15:00", type: "study", color: "var(--c-accent)", height: 60, opacity: 1, yOffset: 0 },
        ];
      case "balanced":
        return [
          { id: "1", name: "Mathematics (High Focus Window)", time: "08:00 – 09:30", type: "study", color: "var(--c-accent)", height: 50, opacity: 1, yOffset: 0 },
          { id: "break-1", name: "Mindful Break (Rest & Hydrate)", time: "09:30 – 09:50", type: "break", color: "#22c55e", height: 35, opacity: 1, yOffset: 0 },
          { id: "2", name: "Physics (Core Syllabus)", time: "09:50 – 11:20", type: "study", color: "var(--c-accent)", height: 50, opacity: 1, yOffset: 0 },
          { id: "break-2", name: "Mindful Break", time: "11:20 – 11:35", type: "break", color: "#22c55e", height: 30, opacity: 1, yOffset: 0 },
          { id: "3", name: "Chemistry (Concept Study)", time: "11:35 – 13:05", type: "study", color: "var(--c-accent)", height: 50, opacity: 1, yOffset: 0 },
        ];
      case "burnout":
        return [
          { id: "1", name: "Mathematics (Shorter Session)", time: "08:00 – 09:15", type: "study", color: "var(--c-accent)", height: 45, opacity: 1, yOffset: 0 },
          { id: "break-1", name: "Break", time: "09:15 – 09:30", type: "break", color: "#22c55e", height: 30, opacity: 1, yOffset: 0 },
          { id: "rest-block", name: "Mandatory Decompression Window", time: "09:30 – 12:00", type: "rest", color: "var(--c-orange)", height: 80, opacity: 1, yOffset: 0 },
          { id: "2", name: "Physics (Deferred to Tomorrow)", time: "Postponed", type: "study", color: "var(--c-surface-3)", height: 40, opacity: 0.6, yOffset: 15 },
        ];
    }
  };

  const triggerSimulation = (state: "initial" | "generated" | "balanced" | "burnout", msg: string) => {
    setIsSimulating(true);
    setStatusMessage("Running algorithm calculation...");
    setTimeout(() => {
      setDemoState(state);
      setIsSimulating(false);
      setStatusMessage(msg);
    }, 1000);
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "360px 1fr",
      gap: "32px",
      background: "var(--c-surface-1)",
      border: "1px solid var(--c-border-1)",
      borderRadius: "18px",
      padding: "32px",
      maxWidth: "1000px",
      margin: "0 auto",
      textAlign: "left"
    }} className="responsive-demo-grid">
      
      {/* Simulation panel */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <span style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#2563EB",
            marginBottom: "8px",
            display: "block"
          }}>
            Interactive Timetable Sandbox
          </span>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: "22px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginBottom: "12px",
            color: "var(--c-text-primary)"
          }}>
            Simulate the AI scheduling engine
          </h3>
          <p style={{
            fontSize: "13.5px",
            color: "var(--c-text-secondary)",
            lineHeight: 1.6,
            marginBottom: "24px"
          }}>
            See how Chronova shifts and builds schedules dynamically depending on priority, wellness, and mental fatigue.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button 
              onClick={() => triggerSimulation("generated", "AI arranged your subjects conflict-free, aligning high priority subjects in your peak energy windows.")}
              disabled={isSimulating}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "10px",
                border: demoState === "generated" ? "1px solid var(--c-accent)" : "1px solid var(--c-border-0)",
                background: demoState === "generated" ? "var(--c-accent-dim)" : "var(--c-surface-2)",
                cursor: "pointer",
                textAlign: "left",
                color: "var(--c-text-primary)",
                transition: "all var(--t-fast)"
              }}
              onMouseEnter={e => {
                if (demoState !== "generated") e.currentTarget.style.background = "var(--c-surface-3)";
              }}
              onMouseLeave={e => {
                if (demoState !== "generated") e.currentTarget.style.background = "var(--c-surface-2)";
              }}
            >
              <RefreshCw size={16} color="var(--c-accent)" className={isSimulating && demoState === "initial" ? "spin" : ""} />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600 }}>1. Generate Timetable</p>
                <p style={{ fontSize: "11px", color: "var(--c-text-secondary)", marginTop: "2px" }}>Auto-arrange pending subjects</p>
              </div>
            </button>

            <button 
              onClick={() => triggerSimulation("balanced", "Chronova detected back-to-back heavy subjects. It inserted strategic 15-20 min breaks, improving retention.")}
              disabled={isSimulating}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "10px",
                border: demoState === "balanced" ? "1px solid var(--c-accent)" : "1px solid var(--c-border-0)",
                background: demoState === "balanced" ? "var(--c-accent-dim)" : "var(--c-surface-2)",
                cursor: "pointer",
                textAlign: "left",
                color: "var(--c-text-primary)",
                transition: "all var(--t-fast)"
              }}
              onMouseEnter={e => {
                if (demoState !== "balanced") e.currentTarget.style.background = "var(--c-surface-3)";
              }}
              onMouseLeave={e => {
                if (demoState !== "balanced") e.currentTarget.style.background = "var(--c-surface-2)";
              }}
            >
              <Brain size={16} color="#22c55e" />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600 }}>2. Balance Productivity</p>
                <p style={{ fontSize: "11px", color: "var(--c-text-secondary)", marginTop: "2px" }}>Shorten slots & insert breaks</p>
              </div>
            </button>

            <button 
              onClick={() => triggerSimulation("burnout", "Burnout protection triggered! Chronova blocked out a recovery window and deferred Physics study.")}
              disabled={isSimulating}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "10px",
                border: demoState === "burnout" ? "1px solid var(--c-accent)" : "1px solid var(--c-border-0)",
                background: demoState === "burnout" ? "var(--c-accent-dim)" : "var(--c-surface-2)",
                cursor: "pointer",
                textAlign: "left",
                color: "var(--c-text-primary)",
                transition: "all var(--t-fast)"
              }}
              onMouseEnter={e => {
                if (demoState !== "burnout") e.currentTarget.style.background = "var(--c-surface-3)";
              }}
              onMouseLeave={e => {
                if (demoState !== "burnout") e.currentTarget.style.background = "var(--c-surface-2)";
              }}
            >
              <Moon size={16} color="var(--c-orange)" />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600 }}>3. Simulate 'I am tired'</p>
                <p style={{ fontSize: "11px", color: "var(--c-text-secondary)", marginTop: "2px" }}>Enforce burnout protection</p>
              </div>
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            setDemoState("initial");
            setStatusMessage("Sandbox reset to initial layout.");
          }}
          disabled={isSimulating}
          style={{
            marginTop: "24px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            color: "var(--c-text-secondary)",
            cursor: "pointer",
            fontSize: "12px",
            alignSelf: "flex-start",
            padding: "4px 8px",
            borderRadius: "6px"
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--c-text-secondary)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--c-text-secondary)"}
        >
          <RefreshCw size={12} /> Reset Sandbox
        </button>
      </div>

      {/* Live Calendar Display */}
      <div style={{
        background: "var(--c-surface-0)",
        border: "1px solid var(--c-border-0)",
        borderRadius: "14px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        minHeight: "360px"
      }}>
        {/* Status update banner */}
        <div style={{
          display: "flex",
          gap: "10px",
          padding: "10px 14px",
          background: "var(--c-surface-1)",
          border: "1px solid var(--c-border-0)",
          borderRadius: "8px",
          marginBottom: "20px",
          alignItems: "flex-start"
        }}>
          <Info size={14} color="var(--c-accent)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <p style={{ fontSize: "12px", color: "var(--c-text-secondary)", lineHeight: 1.5 }}>
            {statusMessage}
          </p>
        </div>

        {/* Schedule layout timeline */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          position: "relative"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--c-text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
              <CalendarRange size={12} /> Live Timeline Simulation
            </span>
            <span style={{
              fontSize: "10px",
              padding: "2px 8px",
              borderRadius: "4px",
              background: demoState === "initial" ? "var(--c-surface-2)" : "var(--c-accent-dim)",
              color: demoState === "initial" ? "var(--c-text-secondary)" : "var(--c-accent)",
              fontWeight: 600
            }}>
              {demoState === "initial" ? "Ready" : demoState === "generated" ? "Schedules Built" : demoState === "balanced" ? "Balanced Flow" : "Rest Active"}
            </span>
          </div>

          {/* List of schedule blocks */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            position: "relative",
            minHeight: "260px",
            justifyContent: "flex-start"
          }}>
            {getBlocks().map((block) => (
              <div
                key={block.id}
                style={{
                  height: `${block.height}px`,
                  opacity: block.opacity,
                  background: block.type === "study" && demoState !== "initial" ? "var(--c-accent-dim)" : block.color,
                  border: block.type === "study" && demoState !== "initial" ? "1px solid var(--c-accent-border)" : "1px solid var(--c-border-0)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  transform: `translateY(${block.yOffset}px)`,
                  transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                  cursor: "default"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: block.type === "study" && demoState !== "initial" ? "var(--c-text-primary)" : "var(--c-text-primary)"
                  }}>
                    {block.name}
                  </span>
                  <span style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: block.type === "study" && demoState !== "initial" ? "var(--c-accent-dim)" : block.type === "break" ? "rgba(34, 197, 94, 0.15)" : block.type === "rest" ? "var(--c-orange-dim)" : "var(--c-surface-3)",
                    color: block.type === "study" && demoState !== "initial" ? "#2563EB" : block.type === "break" ? "#15803D" : block.type === "rest" ? "#B45309" : "#4B5563"
                  }}>
                    {block.type}
                  </span>
                </div>
                <span style={{ fontSize: "10.5px", color: "var(--c-text-secondary)", marginTop: "2px" }}>
                  {block.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .responsive-demo-grid {
            grid-template-columns: 1fr !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
