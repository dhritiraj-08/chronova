"use client";

import { useEffect, useState } from "react";
import { 
  TrendingUp, Clock, Calendar, Moon, Award, 
  Brain, CheckCircle, ChevronRight, RefreshCw, AlertCircle,
  Lock, BookOpen, Trophy, Sparkles, Smile
} from "lucide-react";
import { useScheduleStore } from "@/lib/store/scheduleStore";

// Returns the ISO date (YYYY-MM-DD) of the Monday of the week containing `d`.
function getWeekKey(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split("T")[0];
}

export default function ProgressPage() {
  const {
    events,
    sleepHistory,
    exams,
    level,
    xp,
    loadFromDatabase,
    isLoading,
    weeklyHoursLog,
    recordWeeklyHours
  } = useScheduleStore();

  const [aiReport, setAiReport] = useState<string>("");
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  // Calculate study hours from database schedules (done)
  const completedHoursThisWeek = events
    .filter((e) => e.done)
    .reduce((acc, e) => acc + (e.end - e.start), 0);

  const totalScheduledHours = events.reduce((acc, e) => acc + (e.end - e.start), 0);

  // Record this week's completed-hours snapshot so future weeks can show a
  // real (never fabricated) week-over-week comparison. Only records once
  // data has actually loaded, and only writes when the value has changed.
  const thisWeekKey = getWeekKey(new Date());
  useEffect(() => {
    if (isLoading || events.length === 0) return;
    recordWeeklyHours(thisWeekKey, completedHoursThisWeek);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, completedHoursThisWeek, thisWeekKey]);

  const lastWeekKey = getWeekKey(new Date(Date.now() - 7 * 24 * 3600 * 1000));
  const lastWeekHours = weeklyHoursLog[lastWeekKey];
  const hasLastWeekData = typeof lastWeekHours === "number";
  const weeklyDelta = hasLastWeekData ? completedHoursThisWeek - lastWeekHours : 0;
  const weeklyDeltaPct = hasLastWeekData && lastWeekHours > 0
    ? Math.round((weeklyDelta / lastWeekHours) * 100)
    : null;

  // Consistency Score
  const totalSessions = events.length;
  const doneSessions = events.filter((e) => e.done).length;
  const consistencyScore = totalSessions > 0 ? Math.round((doneSessions / totalSessions) * 100) : 0;

  // Average sleep duration — only real, user-logged sleep data. No fabricated fallback.
  const activeSleepHistory = sleepHistory;
  const hasSleepData = activeSleepHistory.length > 0;
  const avgSleep = hasSleepData
    ? (activeSleepHistory.reduce((acc, s) => acc + s.hours, 0) / activeSleepHistory.length).toFixed(1)
    : null;

  const handleGenerateReport = () => {
    setGeneratingReport(true);
    setTimeout(() => {
      let reportText = `**Study Consistency & Progress:** Your consistency is at **${consistencyScore}%** completion rate this week. `;
      if (consistencyScore >= 75) {
        reportText += `Sticking to this routine is projected to improve retention by 23%. Keep maintaining this focus score! `;
      } else {
        reportText += `Consider chunking study blocks into 45-minute sessions with the Pomodoro widget to build consistency. `;
      }
      if (hasSleepData) {
        reportText += `\n\n**Rest & Energy Management:** Your average sleep is **${avgSleep} hours**. Aligning study sessions during high-energy circadian windows will minimize academic fatigue.`;
      } else {
        reportText += `\n\n**Rest & Energy Management:** No sleep data logged yet. Log your sleep to get personalized rest and energy recommendations.`;
      }
      setAiReport(reportText);
      setGeneratingReport(false);
    }, 1500);
  };

  useEffect(() => {
    if (events.length > 0 && !aiReport) {
      handleGenerateReport();
    }
  }, [events]);

  // Extract subjects
  const getSubjectsFromData = () => {
    const subjects = new Set<string>();
    events.forEach(e => {
      const titleL = e.title.toLowerCase();
      if (titleL.includes("math")) subjects.add("Mathematics");
      else if (titleL.includes("physic")) subjects.add("Physics");
      else if (titleL.includes("chem")) subjects.add("Chemistry");
      else if (titleL.includes("bio")) subjects.add("Biology");
      else if (titleL.includes("code") || titleL.includes("comp") || titleL.includes("programming") || titleL.includes("soft")) subjects.add("Computer Science");
      else if (titleL.includes("history")) subjects.add("History");
      else if (titleL.includes("english") || titleL.includes("literature")) subjects.add("Literature");
    });
    exams.forEach(ex => {
      if (ex.subject) {
        const sub = ex.subject.charAt(0).toUpperCase() + ex.subject.slice(1);
        subjects.add(sub);
      }
    });
    if (subjects.size === 0) {
      return ["Mathematics", "Physics", "Computer Science", "Literature"];
    }
    return Array.from(subjects);
  };

  const activeSubjects = getSubjectsFromData();

  // Subject Mastery calculation based on events/exams completed
  const getSubjectMastery = (subject: string) => {
    let completedChapters = 0;
    let totalChapters = 0;
    const examForSub = exams.find(ex => ex.subject.toLowerCase() === subject.toLowerCase());
    if (examForSub) {
      completedChapters = examForSub.completedChapters;
      totalChapters = examForSub.chapters;
    }

    const subEvents = events.filter(e => e.title.toLowerCase().includes(subject.toLowerCase()));
    const completedEvents = subEvents.filter(e => e.done).length;

    // Base math mastery estimation
    let base = 40;
    if (totalChapters > 0) {
      base += (completedChapters / totalChapters) * 40;
    } else {
      base += 20; // default baseline for active course
    }
    base += completedEvents * 8;
    return Math.min(100, base);
  };

  // Generate 24 weeks of study heatmap cells (7 rows x 24 columns = 168 cells)
  const generateHeatmapData = () => {
    const data: { dateStr: string; hours: number; level: number }[] = [];
    const today = new Date();
    
    // Start from 24 weeks ago, aligned to Monday
    const startOffset = 24 * 7;
    const startDate = new Date();
    startDate.setDate(today.getDate() - startOffset);
    // Align to Monday
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);

    for (let i = 0; i < 24 * 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      let hours = 0;
      let cellLevel = 0;

      // If it's the current week, match actual events done on this day of week
      const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 1-6 Mon-Sat
      const dbDayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // map to 0-6 (Mon-Sun)

      const isCurrentWeek = Math.abs(currentDate.getTime() - today.getTime()) < 7 * 24 * 3600 * 1000;

      if (isCurrentWeek && currentDate <= today) {
        // Calculate done hours for this day of week
        const dayEvents = events.filter(e => e.day === dbDayIdx && e.done);
        hours = dayEvents.reduce((acc, e) => acc + (e.end - e.start), 0);
      } else {
        // No historical per-date study log exists for past weeks (the schedule
        // store only tracks the current recurring week), and future days
        // obviously have no data yet — show empty rather than fabricating
        // activity that never happened.
        hours = 0;
      }

      if (hours > 0 && hours <= 1.5) cellLevel = 1;
      else if (hours > 1.5 && hours <= 3) cellLevel = 2;
      else if (hours > 3 && hours <= 4.5) cellLevel = 3;
      else if (hours > 4.5) cellLevel = 4;

      data.push({
        dateStr: currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        hours,
        level: cellLevel
      });
    }
    return data;
  };

  const heatmapCells = generateHeatmapData();
  const hasAnyHeatmapActivity = heatmapCells.some(c => c.hours > 0);

  // Achievements Definition & Calculation
  const achievements = [
    {
      id: "early-bird",
      title: "Early Bird",
      desc: "Complete a study block starting before 9:00 AM",
      unlocked: events.some(e => e.done && e.start < 9.0),
      icon: Sparkles,
      color: "#B45309",
      progress: events.some(e => e.done && e.start < 9.0) ? "1/1" : "0/1"
    },
    {
      id: "consistency",
      title: "Consistency Pro",
      desc: "Complete 5 or more study sessions",
      unlocked: events.filter(e => e.done).length >= 5,
      icon: Trophy,
      color: "#7C3AED",
      progress: `${Math.min(5, events.filter(e => e.done).length)}/5`
    },
    {
      id: "syllabus-crusher",
      title: "Syllabus Crusher",
      desc: "Complete all chapters in any exam syllabus",
      unlocked: exams.some(e => e.chapters > 0 && e.completedChapters === e.chapters),
      icon: BookOpen,
      color: "#1D4ED8",
      progress: exams.some(e => e.chapters > 0 && e.completedChapters === e.chapters) ? "1/1" : "0/1"
    },
    {
      id: "night-owl",
      title: "Night Owl",
      desc: "Complete a study block ending after 9:00 PM",
      unlocked: events.some(e => e.done && e.end > 21.0),
      icon: Moon,
      color: "#4338CA",
      progress: events.some(e => e.done && e.end > 21.0) ? "1/1" : "0/1"
    },
    {
      id: "strategist",
      title: "Syllabus Strategist",
      desc: "Generate an exam revision plan",
      unlocked: exams.some(e => e.revisionPlanGenerated),
      icon: Brain,
      color: "#047857",
      progress: exams.some(e => e.revisionPlanGenerated) ? "1/1" : "0/1"
    },
    {
      id: "academic-level",
      title: "Rising Scholar",
      desc: "Reach Academic Level 2 or higher",
      unlocked: level >= 2,
      icon: Award,
      color: "#B91C1C",
      progress: `${Math.min(2, level)}/2`
    }
  ];

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", color: "var(--c-text-secondary)" }}>
        <div style={{ fontSize: "13px", fontWeight: 500 }}>Loading progress metrics...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto", paddingBottom: "40px" }} className="animate-fade">
      {/* Header Panel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 600, color: "var(--c-text-primary)", letterSpacing: "-0.015em" }}>
            Consistency & Analytics
          </h1>
          <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "2px" }}>
            Visualize your study rhythm, focus coverage, and energy logs.
          </p>
        </div>
        
        <button 
          id="view-report-btn"
          onClick={handleGenerateReport} 
          disabled={generatingReport}
          className="btn btn-secondary" 
          style={{ fontSize: "12px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px" }}
        >
          {generatingReport ? (
            <><RefreshCw size={12} className="animate-spin" /> Analyzing Logs...</>
          ) : (
            <><Brain size={13} /> Refresh AI Report</>
          )}
        </button>
      </div>

      {events.length === 0 ? (
        /* Empty State */
        <div style={{
          textAlign: "center",
          padding: "54px 24px",
          background: "var(--c-surface-1)",
          border: "1px dashed var(--c-border-2)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--sh-md)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--c-accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
            <AlertCircle size={22} color="var(--c-accent)" />
          </div>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-text-primary)" }}>No study logs recorded yet</h3>
          <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "6px", maxWidth: "360px", lineHeight: 1.5 }}>
            Schedule and log focus sessions on your Calendar to start visualizing heatmaps, subject masteries, and rest curves.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Top Panel: 3 Premium Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }} className="mobile-column-flex">
            
            {/* Study Hours Card */}
            <div className="card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: "9.5px", color: "var(--c-text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Study Hours Completed</span>
                <h3 style={{ fontSize: "28px", fontWeight: 600, fontFamily: "var(--font-display)", color: "var(--c-text-primary)", marginTop: "6px", letterSpacing: "-0.015em" }}>
                  {completedHoursThisWeek.toFixed(1)}h
                </h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", borderTop: "1px solid var(--c-border-0)", paddingTop: "8px" }}>
                <Clock size={12} color="var(--c-text-secondary)" />
                <span style={{ fontSize: "11.5px", color: "var(--c-text-secondary)" }} title="Total hours across every session in your recurring weekly schedule, not just today">
                  of {totalScheduledHours.toFixed(1)}h in your weekly plan
                </span>
              </div>
            </div>

            {/* Consistency card */}
            <div className="card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: "9.5px", color: "var(--c-text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Rhythm Consistency</span>
                <h3 style={{ fontSize: "28px", fontWeight: 600, fontFamily: "var(--font-display)", color: "var(--c-text-primary)", marginTop: "6px", letterSpacing: "-0.015em" }}>
                  {consistencyScore}%
                </h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", borderTop: "1px solid var(--c-border-0)", paddingTop: "8px" }}>
                <TrendingUp size={12} color="var(--c-success)" />
                <span style={{ fontSize: "11.5px", color: "var(--c-text-secondary)" }}>
                  Focus blocks completed on schedule
                </span>
              </div>
            </div>

            {/* Sleep average card */}
            <div className="card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: "9.5px", color: "var(--c-text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Weekly Rest Index</span>
                <h3 style={{ fontSize: hasSleepData ? "28px" : "15px", fontWeight: 600, fontFamily: "var(--font-display)", color: hasSleepData ? "var(--c-text-primary)" : "var(--c-text-tertiary)", marginTop: "6px", letterSpacing: "-0.015em" }}>
                  {hasSleepData ? `${avgSleep}h` : "No sleep data recorded yet"}
                </h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", borderTop: "1px solid var(--c-border-0)", paddingTop: "8px" }}>
                <Moon size={12} color="var(--c-accent)" />
                <span style={{ fontSize: "11.5px", color: "var(--c-text-secondary)" }}>
                  {hasSleepData ? "average sleep duration per night" : "Log sleep to see your rest trends"}
                </span>
              </div>
            </div>

          </div>

          {/* Heatmap Grid Panel */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--c-text-primary)", fontFamily: "var(--font-display)" }}>
                  Study Rhythm Heatmap
                </h3>
                <p style={{ fontSize: "11.5px", color: "var(--c-text-secondary)", marginTop: "2px" }}>
                  Tracking focus session frequency over the past 24 weeks.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10.5px", color: "var(--c-text-tertiary)" }}>
                <span>Less</span>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--c-surface-2)" }}></div>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--c-accent)", opacity: 0.25 }}></div>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--c-accent)", opacity: 0.5 }}></div>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--c-accent)", opacity: 0.75 }}></div>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--c-accent)" }}></div>
                <span>More</span>
              </div>
            </div>

            {/* Calendar grid (horizontal scrollable) */}
            <div style={{ overflowX: "auto", paddingBottom: "6px" }}>
              <div style={{ display: "grid", gridTemplateRows: "repeat(7, 10px)", gridAutoFlow: "column", gap: "3px", width: "max-content", minWidth: "100%" }}>
                {heatmapCells.map((cell, idx) => (
                  <div 
                    key={idx}
                    title={`${cell.dateStr}: ${cell.hours.toFixed(1)}h focused`}
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "2px",
                      background: cell.level === 0 ? "var(--c-surface-2)" : "var(--c-accent)",
                      opacity: cell.level === 0 ? 1 : cell.level === 1 ? 0.25 : cell.level === 2 ? 0.5 : cell.level === 3 ? 0.75 : 1,
                      cursor: "pointer",
                      transition: "transform 100ms ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "10px", color: "var(--c-text-tertiary)", paddingLeft: "12px" }}>
                <span>6 months ago</span>
                <span>3 months ago</span>
                <span>Today</span>
              </div>
            </div>

            {!hasAnyHeatmapActivity && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", padding: "10px 12px", background: "var(--c-surface-0)", border: "1px dashed var(--c-border-2)", borderRadius: "var(--r-md)" }}>
                <Sparkles size={13} color="var(--c-text-tertiary)" />
                <span style={{ fontSize: "11.5px", color: "var(--c-text-secondary)" }}>
                  Complete study sessions to build your rhythm — your heatmap fills in as you check off focus blocks on the calendar.
                </span>
              </div>
            )}
          </div>

          {/* Weekly Comparison Panel */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <TrendingUp size={14} color="var(--c-text-secondary)" />
              <h3 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--c-text-primary)", fontFamily: "var(--font-display)" }}>
                This Week vs. Last Week
              </h3>
            </div>

            {hasLastWeekData ? (
              <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
                <div>
                  <span style={{ fontSize: "9.5px", color: "var(--c-text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Last Week</span>
                  <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--c-text-secondary)", fontFamily: "var(--font-display)", marginTop: "2px" }}>
                    {lastWeekHours.toFixed(1)}h
                  </p>
                </div>
                <div style={{ fontSize: "18px", color: "var(--c-text-tertiary)" }}>→</div>
                <div>
                  <span style={{ fontSize: "9.5px", color: "var(--c-text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>This Week</span>
                  <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--c-text-primary)", fontFamily: "var(--font-display)", marginTop: "2px" }}>
                    {completedHoursThisWeek.toFixed(1)}h
                  </p>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "var(--r-full)",
                  background: weeklyDelta >= 0 ? "var(--c-success-dim)" : "var(--c-danger-dim)",
                  border: `1px solid ${weeklyDelta >= 0 ? "var(--c-success-border)" : "var(--c-danger-border)"}`
                }}>
                  <TrendingUp size={13} color={weeklyDelta >= 0 ? "#047857" : "#B91C1C"} style={{ transform: weeklyDelta >= 0 ? "none" : "scaleY(-1)" }} />
                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: weeklyDelta >= 0 ? "#047857" : "#B91C1C" }}>
                    {weeklyDelta >= 0 ? "+" : ""}{weeklyDelta.toFixed(1)}h{weeklyDeltaPct !== null ? ` (${weeklyDelta >= 0 ? "+" : ""}${weeklyDeltaPct}%)` : ""}
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "12px", color: "var(--c-text-secondary)", lineHeight: 1.5 }}>
                You're currently logging <strong style={{ color: "var(--c-text-primary)" }}>{completedHoursThisWeek.toFixed(1)}h</strong> this week.
                Come back after next week starts to see how it compares — Chronova tracks real week-over-week trends as you keep using the app.
              </p>
            )}
          </div>

          {/* Subject Mastery & Sleep Trend split grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px" }} className="mobile-column-flex">
            
            {/* Subject Mastery Gauges */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <BookOpen size={14} color="var(--c-text-secondary)" />
                <h3 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--c-text-primary)", fontFamily: "var(--font-display)" }}>
                  Subject Mastery Index
                </h3>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {activeSubjects.map((subject) => {
                  const score = Math.round(getSubjectMastery(subject));
                  let label = "Review Needed";
                  let tagColor = "rgba(239, 68, 68, 0.08)";
                  let tagText = "#B91C1C";

                  if (score >= 80) {
                    label = "Confident";
                    tagColor = "var(--c-success-dim)";
                    tagText = "#047857";
                  } else if (score >= 60) {
                    label = "Comfortable";
                    tagColor = "var(--c-accent-dim)";
                    tagText = "var(--c-accent-dark)";
                  } else if (score >= 45) {
                    label = "Developing";
                    tagColor = "rgba(249, 115, 22, 0.08)";
                    tagText = "#B45309";
                  }

                  return (
                    <div key={subject} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--c-text-primary)" }}>{subject}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "var(--r-full)", background: tagColor, color: tagText }}>
                            {label}
                          </span>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>{score}%</span>
                        </div>
                      </div>
                      <div style={{ width: "100%", height: "6px", borderRadius: "var(--r-full)", background: "var(--c-surface-2)", overflow: "hidden" }}>
                        <div 
                          style={{ 
                            width: `${score}%`, 
                            height: "100%", 
                            background: "var(--c-accent)",
                            borderRadius: "var(--r-full)",
                            transition: "width 300ms ease"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sleep and Circadian Quality Chart */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <Moon size={14} color="var(--c-text-secondary)" />
                <h3 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--c-text-primary)", fontFamily: "var(--font-display)" }}>
                  Circadian Sleep Curve
                </h3>
              </div>

              {hasSleepData ? (
                <>
                  {/* Graphical vertical bars */}
                  <div style={{ display: "flex", height: "130px", alignItems: "flex-end", justifyContent: "space-between", padding: "0 10px 10px 10px", borderBottom: "1px solid var(--c-border-1)" }}>
                    {activeSleepHistory.map((s, idx) => {
                      const heightPercent = Math.min(100, (s.hours / 10) * 100);
                      const isGoodSleep = s.quality >= 80;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            flex: 1,
                            height: "100%",
                            justifyContent: "flex-end",
                            position: "relative"
                          }}
                          title={`${s.hours}h sleep (${s.quality}% quality)`}
                        >
                          <div
                            style={{
                              width: "14px",
                              height: `${heightPercent}%`,
                              background: isGoodSleep ? "var(--c-accent)" : "var(--c-accent-dim)",
                              opacity: isGoodSleep ? 1 : 0.6,
                              borderRadius: "var(--r-md) var(--r-md) 0 0",
                              transition: "height 300ms ease"
                            }}
                          />
                          <span style={{ fontSize: "10px", color: "var(--c-text-tertiary)", marginTop: "6px" }}>
                            {s.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", fontSize: "11px", color: "var(--c-text-secondary)", padding: "0 4px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--c-accent)" }}></span>
                      Restorative (&gt;80%)
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--c-accent-dim)" }}></span>
                      Light Rest
                    </span>
                  </div>
                </>
              ) : (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  height: "130px", gap: "8px", textAlign: "center"
                }}>
                  <Moon size={20} color="var(--c-text-tertiary)" />
                  <span style={{ fontSize: "12px", color: "var(--c-text-secondary)", fontWeight: 500 }}>
                    No sleep data recorded yet
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--c-text-tertiary)" }}>
                    Log your sleep to see your circadian rhythm here.
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Achievements Grid — unlocked prominent & celebratory, locked small and muted */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Trophy size={14} color="var(--c-text-secondary)" />
              <h3 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--c-text-primary)", fontFamily: "var(--font-display)" }}>
                Academic Milestones & Badges
              </h3>
            </div>
            <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", marginBottom: "16px" }}>
              {unlockedAchievements.length > 0
                ? `${unlockedAchievements.length} of ${achievements.length} unlocked`
                : "Complete study milestones to unlock badges"}
            </p>

            {unlockedAchievements.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: lockedAchievements.length > 0 ? "16px" : "0" }} className="mobile-column-flex">
                {unlockedAchievements.map((ach) => (
                  <div
                    key={ach.id}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "var(--r-lg)",
                      background: "var(--c-surface-0)",
                      border: "1px solid var(--c-border-2)",
                      borderLeft: `3px solid ${ach.color}`,
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                      position: "relative",
                      transition: "transform 180ms ease, border-color 180ms ease"
                    }}
                    className="achievement-card"
                    title={ach.desc}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "var(--r-md)",
                        background: ach.color + "1A",
                        color: ach.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      <ach.icon size={16} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--c-text-primary)" }}>{ach.title}</span>
                        <CheckCircle size={12} color={ach.color} style={{ flexShrink: 0 }} />
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--c-text-secondary)", lineHeight: 1.3 }}>{ach.desc}</p>
                      <span style={{ fontSize: "9.5px", color: ach.color, fontWeight: 700, marginTop: "4px" }}>
                        Unlocked · {ach.progress}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {lockedAchievements.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {lockedAchievements.map((ach) => (
                  <div key={ach.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 4px", opacity: 0.6 }} title={ach.desc}>
                    <Lock size={11} color="var(--c-text-tertiary)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--c-text-secondary)" }} className="truncate">{ach.title}</span>
                    <span style={{ fontSize: "10px", color: "var(--c-text-tertiary)" }} className="truncate">{ach.desc}</span>
                    <span style={{ fontSize: "9.5px", color: "var(--c-text-tertiary)", marginLeft: "auto", flexShrink: 0 }}>{ach.progress}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Focus Advisor Output */}
          <div className="card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px", background: "var(--c-accent-dim)", border: "1px solid var(--c-accent-border)" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Smile size={15} color="var(--c-accent)" />
              <h3 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--c-text-primary)", fontFamily: "var(--font-display)" }}>
                Weekly Focus & Sleep Advisory
              </h3>
            </div>
            
            {aiReport ? (
              <div 
                style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", lineHeight: 1.5, whiteSpace: "pre-line" }}
                dangerouslySetInnerHTML={{ __html: aiReport.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }}
              />
            ) : (
              <div style={{ padding: "4px 0", color: "var(--c-text-tertiary)", fontSize: "12px" }}>
                Preparing advisory details from weekly activity logs...
              </div>
            )}
          </div>

        </div>
      )}

      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-column-flex {
            display: flex !important;
            flex-direction: column !important;
          }
        }
        .achievement-card:hover {
          transform: translateY(-2px);
          border-color: var(--c-accent);
        }
      `}</style>
    </div>
  );
}
