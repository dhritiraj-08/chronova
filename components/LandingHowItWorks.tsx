"use client";

import { UserPlus, Sparkles, Calendar, MessageSquare } from "lucide-react";

export function LandingHowItWorks() {
  const steps = [
    {
      num: "01",
      icon: UserPlus,
      title: "Tell AI your parameters",
      desc: "Input your subject priorities, sleeping blocks, college hours, and personal goals in under three minutes.",
      color: "var(--c-accent)",
      bg: "var(--c-accent-dim)"
    },
    {
      num: "02",
      icon: Sparkles,
      title: "AI cognitive analysis",
      desc: "Chronova maps out study density, sleep requirements, and priority weights to build a cognitive footprint.",
      color: "var(--c-secondary)",
      bg: "var(--c-secondary-dim)"
    },
    {
      num: "03",
      icon: Calendar,
      title: "Generate smart timetable",
      desc: "Get an interactive weekly calendar with balanced focus blocks, automatically protected sleep, and rest slots.",
      color: "var(--c-accent)",
      bg: "var(--c-accent-dim)"
    },
    {
      num: "04",
      icon: MessageSquare,
      title: "Chat and adapt dynamically",
      desc: "No static spreadsheets. If plans change or you feel fatigued, message your Coach to redistribute your load.",
      color: "var(--c-orange)",
      bg: "var(--c-orange-dim)"
    }
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "24px",
      marginTop: "48px"
    }}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isPaper = index % 2 === 1;
        return (
          <div
            key={step.num}
            style={{
              position: "relative",
              cursor: "default",
              padding: "24px"
            }}
            className={isPaper ? "how-it-works-card card-paper card-paper-hover" : "how-it-works-card card card-hover"}
          >
            {/* Step header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px"
            }}>
              <span style={{
                fontFamily: "var(--font-display)",
                fontSize: "13px",
                fontWeight: 700,
                color: isPaper ? "#6b7280" : "var(--c-text-tertiary)",
                letterSpacing: "0.05em"
              }}>
                STEP {step.num}
              </span>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: step.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Icon size={16} color={step.color} />
              </div>
            </div>

            {/* Title & Desc */}
            <h4 style={{
              fontSize: "14.5px",
              fontWeight: 600,
              color: isPaper ? "var(--c-text-paper)" : "var(--c-text-primary)",
              marginBottom: "8px"
            }}>
              {step.title}
            </h4>
            <p style={{
              fontSize: "13px",
              color: isPaper ? "#4b5563" : "var(--c-text-secondary)",
              lineHeight: 1.6
            }}>
              {step.desc}
            </p>

            {/* Flow arrow (desktop only) */}
            {index < steps.length - 1 && (
              <div style={{
                position: "absolute",
                top: "50%",
                right: "-16px",
                transform: "translateY(-50%)",
                zIndex: 2,
                color: "var(--c-border-1)",
                fontSize: "18px",
                fontWeight: 300,
                pointerEvents: "none"
              }} className="flow-arrow">
                →
              </div>
            )}
          </div>
        );
      })}

      <style jsx global>{`
        @media (max-width: 1024px) {
          .flow-arrow {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
