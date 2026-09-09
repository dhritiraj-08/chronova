"use client";

import { useState, useEffect, useRef } from "react";
import {
  Flame, Play, Pause, RotateCcw, Sparkles,
  ArrowRight, BookOpen, CheckCircle2, Circle,
  Brain, HeartPulse, MessageSquare, Calendar,
  ChevronRight, Award, Maximize2, Minimize2
} from "lucide-react";
import Link from "next/link";
import { useScheduleStore } from "@/lib/store/scheduleStore";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const { 
    events, 
    streak, 
    exams,
    currentMood,
    setCurrentMood,
    scheduleChanges,
    toggleEventDone,
    markEventMissed,
    userName,
    loadFromDatabase,
    isLoading
  } = useScheduleStore();

  const [activeTimerSessionId, setActiveTimerSessionId] = useState<string | number>("");
  const [triggerTimerPlay, setTriggerTimerPlay] = useState(false);

  useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  const now = new Date();
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 (Mon) to 6 (Sun)
  const todayEvents = events
    .filter(e => e.day === todayIdx)
    .sort((a, b) => a.start - b.start);

  const doneCount = todayEvents.filter(e => e.done).length;
  const progressPct = todayEvents.length > 0 ? Math.round((doneCount / todayEvents.length) * 100) : 0;

  // Format decimal hour to HH:MM
  function fmtHour(h: number) {
    const hr = Math.floor(h);
    const min = String(Math.round((h % 1) * 60)).padStart(2, "0");
    const ampm = hr >= 12 ? "PM" : "AM";
    const displayHr = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
    return `${displayHr}:${min} ${ampm}`;
  }

  // Next upcoming session
  const currentDecimalHour = now.getHours() + now.getMinutes() / 60;
  const nextSession = todayEvents.find(e => !e.done && e.start > currentDecimalHour) || todayEvents.find(e => !e.done);

  // Next upcoming exam
  const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date().getTime());
  const upcomingExam = sortedExams.find(ex => new Date(ex.date).getTime() >= new Date().setHours(0,0,0,0));

  // AI Recommendation based on study status & mood
  let aiRecommendation = "You have an optimal schedule today. Start with a 5-minute breathing exercise before your first subject.";
  if (currentMood === "Tired") {
    aiRecommendation = "Energy level is low. We suggest scaling down study blocks slightly and adding 10-minute active recovery breaks.";
  } else if (currentMood === "Stressed") {
    aiRecommendation = "Higher stress levels detected. Focus on revision and practice exercises rather than digesting new concepts.";
  } else if (todayEvents.length > 4 && doneCount === 0) {
    aiRecommendation = "Busy schedule today! Focus on ticking off your first Mathematics session. Avoid cognitive fatigue by taking frequent breaks.";
  } else if (todayEvents.length > 0 && doneCount === todayEvents.length) {
    aiRecommendation = "Outstanding progress! You have completed all today's missions. Enjoy your recovery and rest.";
  }

  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const handleStartToday = () => {
    if (nextSession) {
      setActiveTimerSessionId(nextSession.id);
      setTriggerTimerPlay(true);
      const timerWidget = document.getElementById("pomodoro-card");
      timerWidget?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = "/chat";
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", color: "var(--c-text-secondary)" }}>
        <div style={{ fontSize: "13px", fontWeight: 500 }}>Loading Chronova Home...</div>
      </div>
    );
  }

  const completedHoursToday = todayEvents.filter(e => e.done).reduce((acc, e) => acc + (e.end - e.start), 0);
  const targetHours = 4.0;
  const targetPct = Math.min(100, Math.round((completedHoursToday / targetHours) * 100));

  const achievementDefs = [
    { title: "Bookworm", desc: "Configured study subjects", icon: BookOpen, color: "var(--c-accent-dark)", active: events.length > 0 },
    { title: "Early Bird", desc: "Complete 1 morning study block", icon: Sparkles, color: "var(--c-secondary)", active: todayEvents.some(e => e.done && e.start < 12) },
    { title: "Consistency Hero", desc: "Maintain 3d streak", icon: Flame, color: "#B45309", active: streak >= 3 },
    { title: "Exam Challenger", desc: "Configure an exam syllabus", icon: Award, color: "#047857", active: exams.length > 0 }
  ];
  const unlockedAchievements = achievementDefs.filter(a => a.active);
  const lockedAchievements = achievementDefs.filter(a => !a.active);

  return (
    <div style={{ maxWidth: "1120px", margin: "0 auto" }} className="animate-fade">
      {/* Top Welcome Panel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }} className="animate-up">
        <div>
          <p style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--c-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>
            {dateStr}
          </p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, color: "var(--c-text-primary)", letterSpacing: "-0.02em" }}>
            {greeting}, {userName || "Beast"}
          </h2>
          <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "2px" }}>
            {todayEvents.length > 0
              ? `You have ${todayEvents.length - doneCount} session${todayEvents.length - doneCount === 1 ? "" : "s"} left today.`
              : "Let's set up your first study session."}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="card" style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px", background: "var(--c-surface-1)", boxShadow: "var(--sh-sm)" }}>
            <Flame size={14} color="var(--c-orange)" />
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>{streak || 0}d streak</span>
          </div>

          <button
            id="start-today-btn"
            onClick={handleStartToday}
            className="btn btn-primary"
            style={{ fontSize: "12.5px", padding: "8px 16px", borderRadius: "var(--r-md)", background: "var(--c-accent)", color: "#FFFFFF", border: "1px solid var(--c-accent)" }}
          >
            Start Focus <ArrowRight size={13} style={{ marginLeft: "2px" }} />
          </button>
        </div>
      </div>

      {/* Two-column layout: main flow (what to do, how to focus) + sidebar (supporting info) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "20px" }} className="mobile-column-flex">

        {/* Main column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* AI tip — compact, one line */}
          <div className="card" style={{
            padding: "12px 16px",
            background: "var(--c-accent-dim)",
            borderColor: "var(--c-accent-border)",
            display: "flex", gap: "10px", alignItems: "center",
            boxShadow: "var(--sh-sm)"
          }}>
            <Brain size={15} color="var(--c-accent-dark)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: "12px", color: "var(--c-text-primary)", lineHeight: 1.4 }}>
              <strong style={{ fontWeight: 700 }}>Coach tip:</strong> {aiRecommendation}
            </p>
          </div>

          {/* Today's Focus — THE primary "what do I do today" card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "var(--sh-sm)" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--c-border-1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--c-text-primary)", fontFamily: "var(--font-display)" }}>What do I do today?</h3>
                <p style={{ fontSize: "11.5px", color: "var(--c-text-secondary)", marginTop: "2px" }}>
                  {todayEvents.length > 0
                    ? `${doneCount} of ${todayEvents.length} sessions done — tap one to mark it complete.`
                    : "Nothing scheduled yet. Set up your subjects and schedule below."}
                </p>
              </div>
              {todayEvents.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <div className="progress-track" style={{ width: "60px", height: "4px" }}>
                    <div className="progress-bar" style={{ width: `${progressPct}%`, background: "var(--c-accent)" }} />
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--c-text-secondary)" }}>{progressPct}%</span>
                </div>
              )}
            </div>

            {/* Checklist Items */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {todayEvents.length === 0 ? (
                /* Onboarding Guidance Checklist instead of blank card */
                <div style={{ padding: "8px 0" }}>
                  <div style={{ padding: "12px 20px" }}>
                    <p style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--c-text-secondary)", marginBottom: "12px" }}>
                      Three steps to get your first schedule:
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {[
                        { label: "Tell Chronova about your subjects", href: "/settings", desc: "Select subjects and configure difficulty levels" },
                        { label: "Build your first study schedule", href: "/calendar", desc: "AI Optimize your weekly study and classes grid" },
                        { label: "Add your first upcoming exam milestone", href: "/exams", desc: "Start visual readiness progress tracking" }
                      ].map((item, idx) => (
                        <Link key={idx} href={item.href} style={{ textDecoration: "none" }}>
                          <div
                            style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--c-border-1)", transition: "all var(--t-fast)" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "var(--c-surface-0)"; e.currentTarget.style.borderColor = "var(--c-accent-border)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--c-border-1)"; }}
                          >
                            <div style={{ width: "16px", height: "16px", borderRadius: "var(--r-sm)", border: "1px solid var(--c-border-2)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "1px", color: "var(--c-text-tertiary)", fontSize: "10px", fontWeight: 700 }}>
                              {idx + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>{item.label}</p>
                              <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", marginTop: "1px" }}>{item.desc}</p>
                            </div>
                            <ChevronRight size={13} color="var(--c-text-tertiary)" style={{ marginTop: "3px" }} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                todayEvents.map((ev) => {
                  const isNext = nextSession?.id === ev.id;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => toggleEventDone(ev.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "13px 16px",
                        borderBottom: "1px solid var(--c-border-1)",
                        borderLeft: isNext ? "3px solid var(--c-accent)" : "3px solid transparent",
                        background: isNext ? "var(--c-accent-dim)" : "transparent",
                        cursor: "pointer",
                        transition: "background var(--t-fast)",
                        opacity: ev.done ? 0.6 : 1
                      }}
                      onMouseEnter={e => { if (!isNext) e.currentTarget.style.background = "var(--c-surface-0)"; }}
                      onMouseLeave={e => { if (!isNext) e.currentTarget.style.background = "transparent"; }}
                    >
                      {ev.done ? (
                        <CheckCircle2 size={16} color="var(--c-success)" style={{ flexShrink: 0 }} />
                      ) : (
                        <Circle size={16} color="var(--c-text-tertiary)" style={{ flexShrink: 0 }} />
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--c-text-primary)", textDecoration: ev.done ? "line-through" : "none" }} className="truncate">
                          {ev.title}
                          {isNext && !ev.done && (
                            <span style={{ fontSize: "8.5px", background: "var(--c-accent-dark)", color: "#FFFFFF", padding: "1px 6px", borderRadius: "4px", marginLeft: "8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                              Up next
                            </span>
                          )}
                        </p>
                        <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", marginTop: "1px" }}>
                          {fmtHour(ev.start)} – {fmtHour(ev.end)}
                        </p>
                      </div>

                      {!ev.done && isNext && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTimerSessionId(ev.id);
                            setTriggerTimerPlay(true);
                            document.getElementById("pomodoro-card")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="btn btn-primary"
                          style={{ fontSize: "10.5px", fontWeight: 600, padding: "4px 10px", borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", gap: "3px" }}
                        >
                          <Play size={10} fill="currentColor" /> Focus
                        </button>
                      )}

                      {!ev.done && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markEventMissed(ev.id); }}
                          className="btn btn-secondary"
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "var(--r-sm)",
                            borderColor: "var(--c-orange-border)",
                            background: "var(--c-orange-dim)",
                            color: "#B45309",
                            cursor: "pointer"
                          }}
                        >
                          Reschedule
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Focus Timer — pomodoro + session, one clean section */}
          <FocusTimer
            id="pomodoro-card"
            todayEvents={todayEvents}
            toggleEventDone={toggleEventDone}
            activeSessionId={activeTimerSessionId}
            setActiveSessionId={setActiveTimerSessionId}
            triggerPlay={triggerTimerPlay}
            setTriggerPlay={setTriggerTimerPlay}
          />
        </div>

        {/* Sidebar column: supporting info, not the main task */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Study Target Completion Progress Ring */}
          <div className="card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "var(--sh-sm)" }}>
            <div>
              <h3 style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--c-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Daily Study Target</h3>
              <p style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)", marginTop: "1px" }}>How much of today's 4-hour goal you've banked</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {/* SVG Ring Progress */}
              <div style={{ position: "relative", width: "56px", height: "56px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="56" height="56" viewBox="0 0 50 50" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="25" cy="25" r="22" stroke="var(--c-surface-2)" strokeWidth="4.5" fill="transparent" />
                  <circle cx="25" cy="25" r="22" stroke="var(--c-accent)" strokeWidth="4.5" fill="transparent"
                    strokeDasharray={2 * Math.PI * 22} strokeDashoffset={2 * Math.PI * 22 - (targetPct / 100) * 2 * Math.PI * 22} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s" }} />
                </svg>
                <span style={{ position: "absolute", fontSize: "11px", fontWeight: 800, color: "var(--c-text-primary)" }}>{targetPct}%</span>
              </div>

              <div>
                <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>{completedHoursToday.toFixed(1)} hrs completed</p>
                <p style={{ fontSize: "11px", color: "var(--c-text-secondary)", marginTop: "1px" }}>Target: 4.0 hours daily study</p>
              </div>
            </div>
          </div>

          {/* Upcoming Exam readiness count down */}
          <div className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "var(--sh-sm)" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "var(--r-md)", background: "var(--c-orange-dim)", border: "1px solid var(--c-orange-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Award size={14} color="#B45309" />
            </div>
            {upcomingExam ? (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "9px", color: "var(--c-text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Upcoming Exam</p>
                  <p style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--c-text-primary)", marginTop: "1px" }} className="truncate">
                    {upcomingExam.name}
                  </p>
                  <p style={{ fontSize: "10.5px", color: "var(--c-text-secondary)", marginTop: "1px" }}>
                    {upcomingExam.date} ({Math.max(0, Math.ceil((new Date(upcomingExam.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}d remaining)
                  </p>
                </div>
                <Link href="/exams">
                  <button className="btn btn-icon" style={{ width: "26px", height: "26px" }} title="Open Exams page">
                    <ChevronRight size={12} />
                  </button>
                </Link>
              </>
            ) : (
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "9px", color: "var(--c-text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Upcoming Exam</p>
                <p style={{ fontSize: "12px", color: "var(--c-text-secondary)", marginTop: "1px" }}>
                  No upcoming exams. Register your exams to generate revision logs.
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className="card" style={{ padding: "14px 16px", boxShadow: "var(--sh-sm)" }}>
            <h3 style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--c-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Quick Actions</h3>
            <p style={{ fontSize: "10px", color: "var(--c-text-tertiary)", marginBottom: "8px" }}>Jump straight to a common task</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {[
                { href: "/chat",     icon: MessageSquare, label: "Ask the AI Mentor", sub: "Chat to reschedule, get study tips, or vent about a hard day" },
                { href: "/calendar", icon: Calendar,      label: "Edit this week's schedule", sub: "Move sessions around or let AI re-optimize your week" },
                { href: "/settings", icon: HeartPulse,    label: "Update your preferences", sub: "Change subjects, sleep hours, or study style" },
              ].map(({ href, icon: Icon, label, sub }) => (
                <Link key={label} href={href} style={{ textDecoration: "none" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 6px", borderRadius: "var(--r-md)", transition: "background var(--t-fast)", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface-0)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ width: "26px", height: "26px", borderRadius: "var(--r-sm)", background: "var(--c-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={12} color="var(--c-text-secondary)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>{label}</p>
                      <p style={{ fontSize: "10px", color: "var(--c-text-secondary)", lineHeight: 1.3 }}>{sub}</p>
                    </div>
                    <ChevronRight size={11} color="var(--c-text-tertiary)" style={{ flexShrink: 0 }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Academic Achievements — unlocked prominent, locked small */}
          <div className="card" style={{ padding: "14px 16px", boxShadow: "var(--sh-sm)" }}>
            <h3 style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--c-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>Academic Achievements</h3>
            <p style={{ fontSize: "10px", color: "var(--c-text-tertiary)", marginBottom: "10px" }}>
              {unlockedAchievements.length > 0 ? `${unlockedAchievements.length} of ${achievementDefs.length} unlocked` : "Complete study milestones to unlock badges"}
            </p>

            {unlockedAchievements.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: lockedAchievements.length > 0 ? "12px" : "0" }}>
                {unlockedAchievements.map((badge) => (
                  <div
                    key={badge.title}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "var(--r-md)",
                      border: "1px solid var(--c-border-2)",
                      background: "var(--c-surface-0)",
                      borderLeft: `3px solid ${badge.color}`,
                      display: "flex", alignItems: "center", gap: "8px"
                    }}
                    title={badge.desc}
                  >
                    <div style={{ width: "24px", height: "24px", borderRadius: "var(--r-sm)", background: badge.color + "1A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <badge.icon size={12} color={badge.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>{badge.title}</p>
                      <p style={{ fontSize: "9.5px", color: "var(--c-text-secondary)", lineHeight: 1.2 }} className="truncate">{badge.desc}</p>
                    </div>
                    <CheckCircle2 size={13} color={badge.color} style={{ flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            )}

            {lockedAchievements.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {lockedAchievements.map((badge) => (
                  <div key={badge.title} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 2px", opacity: 0.55 }} title={badge.desc}>
                    <badge.icon size={11} color="var(--c-text-tertiary)" style={{ flexShrink: 0 }} />
                    <p style={{ fontSize: "10.5px", color: "var(--c-text-secondary)" }} className="truncate">{badge.title}</p>
                    <span style={{ fontSize: "9.5px", color: "var(--c-text-tertiary)", marginLeft: "auto", flexShrink: 0 }} className="truncate">{badge.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <style jsx global>{`
        @media (max-width: 900px) {
          .mobile-column-flex {
            display: flex !important;
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}

/* Redesigned Pomodoro Focus Timer Widget */
interface TimerProps {
  id?: string;
  todayEvents: any[];
  toggleEventDone: (id: string | number) => void;
  activeSessionId: string | number;
  setActiveSessionId: (id: string | number) => void;
  triggerPlay: boolean;
  setTriggerPlay: (val: boolean) => void;
}

function FocusTimer({
  id,
  todayEvents,
  toggleEventDone,
  activeSessionId,
  setActiveSessionId,
  triggerPlay,
  setTriggerPlay
}: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [isBreakMode, setIsBreakMode] = useState(false);
  const [completedBanner, setCompletedBanner] = useState("");
  // "compact" = default small card. "expanded" = larger prominent view, entered
  // automatically the moment a focus block starts. "fullscreen" = the maximize
  // button's overlay, which takes up most of the screen.
  const [mode, setMode] = useState<"compact" | "expanded" | "fullscreen">("compact");
  const modeBeforeFullscreen = useRef<"compact" | "expanded">("compact");

  const uncompletedSessions = todayEvents.filter(e => !e.done);

  function fmtStart(h: number) {
    const hr = Math.floor(h);
    const min = String(Math.round((h % 1) * 60)).padStart(2, "0");
    const ampm = hr >= 12 ? "PM" : "AM";
    const displayHr = hr % 12 === 0 ? 12 : hr % 12;
    return `${displayHr}:${min} ${ampm}`;
  }

  useEffect(() => {
    if (triggerPlay) {
      setTimerActive(true);
      setMode(m => m === "fullscreen" ? m : "expanded");
      setTriggerPlay(false);
    }
  }, [triggerPlay, setTriggerPlay]);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setTimerActive(false);
      if (!isBreakMode) {
        if (activeSessionId) {
          toggleEventDone(activeSessionId);
          const completedSlot = todayEvents.find(e => e.id === activeSessionId);
          setCompletedBanner(`Finished: ${completedSlot?.title || "Focus block"}!`);
          setActiveSessionId("");
        } else {
          setCompletedBanner("Session completed!");
        }
        setIsBreakMode(true);
        setTimeRemaining(5 * 60);
      } else {
        setCompletedBanner("Break completed!");
        setIsBreakMode(false);
        setTimeRemaining(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining, isBreakMode, activeSessionId, todayEvents, toggleEventDone, setActiveSessionId]);

  useEffect(() => {
    if (completedBanner) {
      const t = setTimeout(() => setCompletedBanner(""), 4000);
      return () => clearTimeout(t);
    }
  }, [completedBanner]);

  const toggleTimer = () => {
    setTimerActive(prev => {
      const starting = !prev;
      if (starting) setMode(m => m === "fullscreen" ? m : "expanded");
      return starting;
    });
  };

  const resetTimer = () => {
    setTimerActive(false);
    setIsBreakMode(false);
    setTimeRemaining(25 * 60);
    setCompletedBanner("");
    setMode("compact");
  };

  function enterFullscreen() {
    modeBeforeFullscreen.current = mode === "fullscreen" ? "expanded" : mode;
    setMode("fullscreen");
  }

  function exitFullscreen() {
    setMode(modeBeforeFullscreen.current);
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeStr = `${minutes}:${String(seconds).padStart(2, "0")}`;

  const totalTime = isBreakMode ? 5 * 60 : 25 * 60;
  const progressPct = (timeRemaining / totalTime) * 100;
  const circleRadius = 30;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  // Rendered twice at most (inline card, fullscreen overlay) but never both
  // at once — `variant` keeps form element ids unique and picks sizing.
  function renderBody(variant: "inline" | "overlay") {
    const big = variant === "overlay";
    const expanded = big || mode === "expanded";
    const ringPx = big ? 260 : expanded ? 148 : 84;
    const selectId = `timer-link-session-${variant}`;

    return (
      <>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
          <div>
            <h3 style={{ fontSize: big ? "18px" : "13px", fontWeight: 600, fontFamily: "var(--font-display)", color: "var(--c-text-primary)" }}>
              Focus Timer
            </h3>
            <p style={{ fontSize: big ? "13px" : "11px", color: "var(--c-text-secondary)", marginTop: "1px", lineHeight: 1.4 }}>
              {isBreakMode
                ? "Rest and take a deep breath — your 5-minute break is running."
                : "Pick a session below, hit Focus, and we'll run a 25-minute block with an automatic break after."}
            </p>
          </div>
          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
            {big ? (
              <button onClick={exitFullscreen} className="btn btn-secondary" style={{ padding: "6px", borderRadius: "var(--r-md)", display: "flex" }} title="Exit fullscreen">
                <Minimize2 size={14} />
              </button>
            ) : (
              <button onClick={enterFullscreen} className="btn btn-secondary" style={{ padding: "6px", borderRadius: "var(--r-md)", display: "flex" }} title="Maximize">
                <Maximize2 size={13} />
              </button>
            )}
          </div>
        </div>

        {completedBanner && (
          <div style={{
            marginTop: "10px", background: "var(--c-accent-dim)", border: "1px solid var(--c-accent-border)",
            borderRadius: "var(--r-md)", padding: "8px 12px", display: "flex", gap: "4px", alignItems: "center"
          }} className="animate-up">
            <Sparkles size={12} color="var(--c-accent-dark)" />
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--c-accent-dark)" }}>{completedBanner}</span>
          </div>
        )}

        {/* Circle Loader */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: big ? "28px 0" : expanded ? "18px 0" : "12px 0", position: "relative" }}>
          <svg width={ringPx} height={ringPx} viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r={circleRadius} stroke="rgba(255,255,255,0.015)" strokeWidth="4" fill="transparent" />
            <circle cx="50" cy="50" r={circleRadius} stroke={isBreakMode ? "var(--c-success)" : "var(--c-accent)"} strokeWidth="4" fill="transparent"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.35s" }} />
          </svg>

          <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: big ? "44px" : expanded ? "26px" : "16px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--c-text-primary)", letterSpacing: "-0.01em" }}>{timeStr}</span>
            <span style={{ fontSize: big ? "13px" : expanded ? "10px" : "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: isBreakMode ? "#047857" : "var(--c-accent-dark)" }}>
              {isBreakMode ? "Break" : "Focus"}
            </span>
            {activeSessionId && !isBreakMode && (
              <span style={{ fontSize: big ? "13px" : "10px", color: "var(--c-text-secondary)", marginTop: "4px", maxWidth: big ? "320px" : "140px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {todayEvents.find(e => e.id === activeSessionId)?.title}
              </span>
            )}
          </div>
        </div>

        {/* Linked study session dropdown */}
        <div style={{ marginBottom: big ? "18px" : "10px", maxWidth: big ? "360px" : undefined, margin: big ? "0 auto 18px" : undefined }}>
          <label className="form-label" style={{ fontSize: big ? "12px" : "10px", fontWeight: 600 }} htmlFor={selectId}>Which session is this for?</label>
          <select
            id={selectId}
            value={activeSessionId}
            onChange={e => setActiveSessionId(e.target.value)}
            disabled={timerActive || isBreakMode}
            className="input"
            style={{ padding: big ? "10px 12px" : "6px 10px", background: "var(--c-surface-2)", color: "var(--c-text-secondary)", fontSize: big ? "13px" : "12px" }}
          >
            <option value="">-- General Study --</option>
            {uncompletedSessions.map(s => (
              <option key={s.id} value={s.id}>
                {fmtStart(s.start)} — {s.title}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "8px", maxWidth: big ? "360px" : undefined, margin: big ? "0 auto" : undefined }}>
          <button onClick={toggleTimer} className="btn btn-primary" style={{ flex: 1, fontSize: big ? "14px" : "12px", padding: big ? "12px" : "8px", borderRadius: "var(--r-md)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
            {timerActive ? <><Pause size={big ? 15 : 12} /> Pause</> : <><Play size={big ? 15 : 12} fill="currentColor" /> Focus</>}
          </button>
          <button onClick={resetTimer} className="btn btn-secondary" style={{ padding: big ? "12px" : "8px", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", justifyContent: "center" }} title="Reset Timer">
            <RotateCcw size={big ? 15 : 12} />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div id={id} className="card" style={{ padding: "16px 20px", position: "relative", overflow: "hidden", transition: "all var(--t-base)" }}>
        {mode === "fullscreen" ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-display)", color: "var(--c-text-primary)" }}>Focus Timer</span>
            <button onClick={exitFullscreen} className="btn btn-secondary" style={{ padding: "6px 10px", borderRadius: "var(--r-md)", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Minimize2 size={12} /> Running in fullscreen
            </button>
          </div>
        ) : renderBody("inline")}
      </div>

      {mode === "fullscreen" && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,17,23,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 }}
          onClick={(e) => { if (e.target === e.currentTarget) exitFullscreen(); }}
        >
          <div className="card animate-up" style={{ padding: "32px 40px", width: "min(520px, 92vw)", background: "var(--c-surface-1)", border: "1px solid var(--c-border-1)" }}>
            {renderBody("overlay")}
          </div>
        </div>
      )}
    </>
  );
}
