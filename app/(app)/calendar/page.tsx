"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, ChevronRight, Plus, Check, Trash2, X, 
  Download, Sparkles, AlertCircle, Edit2, Play, Circle, Calendar as CalendarIcon
} from "lucide-react";
import { useScheduleStore, ScheduleEvent } from "@/lib/store/scheduleStore";
import { createClient } from "@/lib/supabase/client";
import { generateRulesBasedSchedule } from "@/lib/scheduling/engine";
import { TimeInput } from "@/components/TimeInput";

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am – 10pm
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_HEIGHT = 64;
const START_HOUR = 6;

// Refined Category color mapping
// `text` is used as the event title's text color on the light calendar grid, so
// each one is a darker, WCAG AA-safe shade of its hue (verified >=4.5:1 on the
// grid's cream background) — `dot`/`bg`/`border` stay as the original bright
// swatch colors since those are only ever used decoratively, not as text.
const SUBJECT_COLORS = [
  { name: "Study (Math/Science)", bg: "rgba(139, 92, 246, 0.04)", border: "rgba(139, 92, 246, 0.12)", dot: "#8B5CF6", text: "#7C3AED" }, // Purple
  { name: "Exam Milestone",       bg: "rgba(239, 68, 68, 0.04)",  border: "rgba(239, 68, 68, 0.12)",  dot: "#EF4444",  text: "#DC2626" }, // Red
  { name: "College/Classes",     bg: "rgba(59, 130, 246, 0.04)", border: "rgba(59, 130, 246, 0.12)", dot: "#3B82F6", text: "#1D4ED8" }, // Blue
  { name: "Revision Slot",       bg: "rgba(249, 115, 22, 0.04)", border: "rgba(249, 115, 22, 0.12)", dot: "#F97316", text: "#B45309" }, // Orange
  { name: "Gym & Workout",       bg: "rgba(34, 197, 94, 0.04)",  border: "rgba(34, 197, 94, 0.12)",  dot: "#22C55E", text: "#15803D" }, // Green
  { name: "Personal/Hobby",      bg: "rgba(168, 162, 158, 0.04)", border: "rgba(168, 162, 158, 0.12)", dot: "#A8A29E", text: "#57534E" } // Stone (Muted grey)
];

function fmtHour(h: number) {
  const hr = Math.floor(h);
  const min = String(Math.round((h % 1) * 60)).padStart(2, "0");
  return `${hr}:${min}`;
}

// The Edit Session modal stores start/end as decimal hours (e.g. 14.5), while
// TimeInput speaks 24-hour "HH:MM" strings — these convert between the two.
function decimalToTimeStr(h: number): string {
  const hour = Math.floor(h);
  const min = Math.round((h % 1) * 60);
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function timeStrToDecimal(t: string): number {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h + m / 60;
}

interface PositionedEvent {
  event: ScheduleEvent;
  left: string;
  width: string;
  laneCount: number;
}

function getPositionedEvents(events: ScheduleEvent[]): PositionedEvent[] {
  const sorted = [...events].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return a.end - b.end;
  });

  const clusters: ScheduleEvent[][] = [];
  let currentCluster: ScheduleEvent[] = [];
  let clusterEnd = 0;

  for (const ev of sorted) {
    if (ev.start >= clusterEnd) {
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }
      currentCluster = [ev];
      clusterEnd = ev.end;
    } else {
      currentCluster.push(ev);
      clusterEnd = Math.max(clusterEnd, ev.end);
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const positioned: PositionedEvent[] = [];

  for (const cluster of clusters) {
    const lanes: number[] = [];
    const eventLanes = new Map<string | number, number>();

    for (const ev of cluster) {
      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        if (ev.start >= lanes[i] - 0.01) {
          lanes[i] = ev.end;
          eventLanes.set(ev.id, i);
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes.push(ev.end);
        eventLanes.set(ev.id, lanes.length - 1);
      }
    }

    const totalLanes = lanes.length;

    for (const ev of cluster) {
      const laneIdx = eventLanes.get(ev.id) ?? 0;
      const colWidth = 100 / totalLanes;
      const leftPercent = laneIdx * colWidth;

      const left = `calc(${leftPercent}% + ${4 - (4 * laneIdx / totalLanes)}px)`;
      const width = `calc(${colWidth}% - ${4 * (totalLanes + 1) / totalLanes}px)`;

      positioned.push({
        event: ev,
        left,
        width,
        laneCount: totalLanes,
      });
    }
  }

  return positioned;
}

export default function CalendarPage() {
  const { 
    events, 
    exams,
    addEvent, 
    removeEvent, 
    toggleEventDone,
    updateEvent,
    setEvents,
    loadFromDatabase,
    isLoading
  } = useScheduleStore();

  const supabase = createClient();
  const [view, setView] = useState<"week" | "day">("week");
  const [selectedDay, setSelectedDay] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    event: ScheduleEvent | null;
  }>({ x: 0, y: 0, event: null });

  // Edit State
  const [showEdit, setShowEdit] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);

  // New Event Form State
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    day: 0, 
    start: "09:00", 
    end: "10:00", 
    colorIdx: 0 
  });

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;

  useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  // Click outside to close context menus
  const contextRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contextRef.current && !contextRef.current.contains(event.target as Node)) {
        setContextMenu({ x: 0, y: 0, event: null });
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function getColumnDate(dayIdx: number, offset: number) {
    const d = new Date();
    const currentDay = d.getDay();
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    d.setDate(d.getDate() + daysToMonday + dayIdx + offset * 7);
    return d;
  }

  function getHeaderDateLabel() {
    const monday = getColumnDate(0, weekOffset);
    const sunday = getColumnDate(6, weekOffset);
    
    if (view === "day") {
      const selectedDate = getColumnDate(selectedDay, weekOffset);
      return selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
    
    const formatMonthYear = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const formatMonthOnly = (d: Date) => d.toLocaleDateString("en-US", { month: "long" });

    if (monday.getFullYear() !== sunday.getFullYear()) {
      return `${formatMonthYear(monday)} – ${formatMonthYear(sunday)}`;
    }
    if (monday.getMonth() !== sunday.getMonth()) {
      return `${formatMonthOnly(monday)} – ${formatMonthYear(sunday)}`;
    }
    return formatMonthYear(monday);
  }

  const displayDays = view === "week" ? DAYS : [DAYS[selectedDay]];

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) return;
    const sh = parseInt(newEvent.start.split(":")[0]) + parseInt(newEvent.start.split(":")[1]) / 60;
    const eh = parseInt(newEvent.end.split(":")[0]) + parseInt(newEvent.end.split(":")[1]) / 60;
    await addEvent({
      title: newEvent.title,
      day: newEvent.day,
      start: sh,
      end: eh,
      done: false,
      colorIdx: newEvent.colorIdx
    });
    setNewEvent({ title: "", day: 0, start: "09:00", end: "10:00", colorIdx: 0 });
    setShowAdd(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    
    await updateEvent(editingEvent.id, {
      title: editingEvent.title,
      day: editingEvent.day,
      start: editingEvent.start,
      end: editingEvent.end,
      colorIdx: editingEvent.colorIdx
    });

    setShowEdit(false);
    setEditingEvent(null);
  };

  // AI Optimize Week timetabling engine trigger
  const handleAIOptimize = async () => {
    setOptimizing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load subjects
      const { data: dbSubjects } = await supabase
        .from("subjects")
        .select("*")
        .eq("user_id", user.id);

      // Load profile info for sleep constraints
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!dbSubjects || dbSubjects.length === 0) {
        alert("Please configure subjects during onboarding/settings before optimizing your week.");
        setOptimizing(false);
        return;
      }

      // Convert subjects
      const subjects = dbSubjects.map((s) => ({
        name: s.subject_name,
        difficulty: s.difficulty_level,
        color: s.color
      }));

      const weak_subjects = dbSubjects
        .filter((s) => s.priority === 3)
        .map((s) => s.subject_name);

      const payload = {
        name: profile?.name || "Student",
        sleep_start: profile?.sleep_start || "23:00",
        sleep_end: profile?.sleep_end || "07:00",
        college_start: "09:00",
        college_end: "15:00",
        subjects,
        weak_subjects
      };

      const result = generateRulesBasedSchedule(payload);
      
      // Convert result to ScheduleEvents
      const optimizedEvents: ScheduleEvent[] = [];
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

      result.schedule.forEach((daySchedule: any) => {
        const dayIdx = days.indexOf(daySchedule.day);
        if (dayIdx === -1) return;

        daySchedule.sessions.forEach((s: any, idx: number) => {
          const sh = parseInt(s.start.split(":")[0]) + parseInt(s.start.split(":")[1]) / 60;
          const eh = parseInt(s.end.split(":")[0]) + parseInt(s.end.split(":")[1]) / 60;
          
          let colorIdx = 0; // Study purple
          if (s.type === "class") colorIdx = 2; // Cyan
          else if (s.type === "break") colorIdx = 5; // Slate
          else if (s.type === "gym") colorIdx = 4; // Blue

          optimizedEvents.push({
            id: `opt-${dayIdx}-${idx}-${Date.now()}`,
            title: s.title,
            day: dayIdx,
            start: sh,
            end: eh,
            done: false,
            colorIdx
          });
        });
      });

      // Save to store & database
      await setEvents(optimizedEvents);
    } catch (e) {
      console.error(e);
      alert("Error optimizing weekly timetable.");
    } finally {
      setOptimizing(false);
    }
  };

  const handleOpenContextMenu = (e: React.MouseEvent, ev: ScheduleEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      event: ev
    });
  };

  const exportStudentTimetableToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export the PDF.");
      return;
    }

    const PRINT_COLORS = [
      { border: "#8b5cf6", bg: "#f5f3ff", text: "#6d28d9" },
      { border: "#10b981", bg: "#ecfdf5", text: "#047857" },
      { border: "#06b6d4", bg: "#ecfeff", text: "#0e7490" },
      { border: "#38bdf8", bg: "#f0f9ff", text: "#0369a1" },
      { border: "#f43f5e", bg: "#fff1f2", text: "#be123c" },
      { border: "#6366f1", bg: "#eef2ff", text: "#4338ca" },
    ];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Schedule Timetable</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 20px; }
            .header { border-bottom: 2px solid #8b5cf6; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-family: 'Outfit', sans-serif; font-size: 24px; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; vertical-align: top; }
            th { background-color: #f8fafc; font-size: 11px; text-transform: uppercase; color: #475569; }
            .event-card { padding: 6px 10px; border-radius: 6px; font-size: 11px; margin-bottom: 4px; border-left: 3px solid #8b5cf6; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">My Study Schedule</h1>
            <p>Chronova AI Academic System</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                ${DAYS.map(day => `<th>${day}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${HOURS.map(h => `
                <tr>
                  <td style="font-weight: 600; font-size: 11px; width: 80px;">${h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`}</td>
                  ${[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                    const hourEvents = events.filter(e => e.day === dayIdx && Math.floor(e.start) === h);
                    return `
                      <td>
                        ${hourEvents.map(ev => {
                          const c = PRINT_COLORS[ev.colorIdx % PRINT_COLORS.length];
                          return `
                            <div class="event-card" style="background-color: ${c.bg}; border-left-color: ${c.border}; color: ${c.text}">
                              <strong>${ev.title}</strong><br/>
                              ${fmtHour(ev.start)} – ${fmtHour(ev.end)}
                            </div>
                          `;
                        }).join("")}
                      </td>
                    `;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); setTimeout(window.close, 500); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", color: "var(--c-text-secondary)" }}>
        <div style={{ fontSize: "13px", fontWeight: 500 }}>Loading Schedule OS...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1280px", height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }} className="animate-fade">
      {/* Header controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--c-text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.010em" }}>
            {getHeaderDateLabel()}
          </h2>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {/* View toggle */}
          <div style={{ display: "flex", background: "var(--c-surface-1)", borderRadius: "var(--r-md)", padding: "2px", border: "1px solid var(--c-border-1)" }}>
            {(["week", "day"] as const).map(v => (
              <button 
                key={v} 
                onClick={() => setView(v)} 
                style={{
                  padding: "4px 10px", borderRadius: "var(--r-sm)", border: "none", cursor: "pointer",
                  fontSize: "12px", fontWeight: 500, transition: "all var(--t-fast)",
                  background: view === v ? "var(--c-surface-3)" : "transparent",
                  color: view === v ? "var(--c-text-primary)" : "var(--c-text-tertiary)"
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Nav buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <button onClick={() => setWeekOffset(p => p - 1)} className="btn btn-icon" style={{ width: "28px", height: "28px" }}><ChevronLeft size={14} /></button>
            <button onClick={() => setWeekOffset(0)} className="btn btn-ghost" style={{ fontSize: "12px", padding: "4px 10px" }}>Today</button>
            <button onClick={() => setWeekOffset(p => p + 1)} className="btn btn-icon" style={{ width: "28px", height: "28px" }}><ChevronRight size={14} /></button>
          </div>

          {/* AI Optimize week */}
          <button 
            id="ai-optimize-btn"
            onClick={handleAIOptimize} 
            disabled={optimizing}
            className="btn btn-secondary" 
            style={{ fontSize: "12px", padding: "8px 12px", borderColor: "var(--c-border-1)", color: "var(--c-text-primary)" }}
          >
            {optimizing ? (
              <><Sparkles size={12} className="animate-pulse" /> Optimizing...</>
            ) : (
              <><Sparkles size={12} /> AI Optimize Week</>
            )}
          </button>

          <button 
            onClick={exportStudentTimetableToPDF} 
            className="btn btn-secondary" 
            style={{ fontSize: "12px", padding: "8px 12px" }}
          >
            <Download size={13} style={{ marginRight: "2px" }} /> Export
          </button>

          <button 
            id="add-session-btn"
            onClick={() => setShowAdd(true)} 
            className="btn btn-primary" 
            style={{ fontSize: "12px", padding: "8px 12px" }}
          >
            <Plus size={13} style={{ marginRight: "2px" }} /> Add Session
          </button>
        </div>
      </div>

      {/* Day Selector (day view only) */}
      {view === "day" && (
        <div style={{ display: "flex", gap: "4px", marginBottom: "10px" }}>
          {DAYS.map((d, i) => (
            <button 
              key={d} 
              onClick={() => setSelectedDay(i)} 
              style={{
                padding: "6px 12px", borderRadius: "var(--r-md)", cursor: "pointer", fontSize: "12px",
                background: selectedDay === i ? "var(--c-surface-2)" : "transparent",
                border: "1px solid " + (selectedDay === i ? "var(--c-border-2)" : "var(--c-border-1)"),
                color: selectedDay === i ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                fontWeight: selectedDay === i ? 600 : 400,
                transition: "all var(--t-fast)"
              }}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {/* Calendar Planner Board */}
      <div style={{ flex: 1, background: "var(--c-surface-0)", border: "1px solid var(--c-border-1)", borderRadius: "var(--r-lg)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        
        {/* Day Headers */}
        <div style={{ display: "grid", gridTemplateColumns: `60px repeat(${displayDays.length}, 1fr)`, borderBottom: "1px solid var(--c-border-1)", background: "rgba(255,255,255,0.01)" }}>
          <div style={{ padding: "10px" }} />
          {displayDays.map((day, i) => {
            const di = view === "week" ? i : selectedDay;
            const isToday = di === todayIdx && weekOffset === 0;
            const colDate = getColumnDate(di, weekOffset);
            
            // Find exams on this day
            const dayExams = exams.filter(ex => {
              const exDate = new Date(ex.date);
              return exDate.getDate() === colDate.getDate() && exDate.getMonth() === colDate.getMonth() && exDate.getFullYear() === colDate.getFullYear();
            });

            // Calculate target completion
            const dayEvents = events.filter(e => e.day === di);
            const completedHrs = dayEvents.filter(e => e.done).reduce((acc, e) => acc + (e.end - e.start), 0);
            const totalHrs = dayEvents.reduce((acc, e) => acc + (e.end - e.start), 0);

            return (
              <div key={day} style={{ padding: "8px 6px", textAlign: "center", borderLeft: "1px solid var(--c-border-1)" }}>
                <p style={{ fontSize: "9px", color: isToday ? "var(--c-accent-dark)" : "var(--c-text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {day}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "2px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 750, color: isToday ? "var(--c-accent-dark)" : "var(--c-text-primary)" }}>
                    {colDate.getDate()}
                  </span>
                  {totalHrs > 0 && (
                    <span style={{ fontSize: "9px", background: completedHrs === totalHrs ? "var(--c-success-dim)" : "var(--c-surface-2)", color: completedHrs === totalHrs ? "#047857" : "var(--c-text-secondary)", border: "1px solid " + (completedHrs === totalHrs ? "var(--c-success-border)" : "var(--c-border-1)"), padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
                      {completedHrs.toFixed(0)}/{totalHrs.toFixed(0)}h
                    </span>
                  )}
                </div>
                {dayExams.map(ex => (
                  <div key={ex.id} style={{ display: "inline-flex", background: "var(--c-danger-dim)", color: "#B91C1C", border: "1px solid var(--c-danger-border)", padding: "1px 4px", borderRadius: "3px", fontSize: "8.5px", fontWeight: 700, marginTop: "4px" }} title={ex.name}>
                    🚩 Exam
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Scrollable Timeline Grid */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: `60px repeat(${displayDays.length}, 1fr)`, minHeight: `${HOUR_HEIGHT * HOURS.length}px` }}>
            
            {/* Hour markers */}
            <div style={{ background: "rgba(255,255,255,0.005)" }}>
              {HOURS.map(h => (
                <div key={h} style={{ height: `${HOUR_HEIGHT}px`, display: "flex", alignItems: "flex-start", paddingTop: "6px", paddingRight: "8px", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: "9.5px", color: "var(--c-text-secondary)", fontWeight: 500 }}>
                    {h > 12 ? `${h - 12}pm` : h === 12 ? "12pm" : `${h}am`}
                  </span>
                </div>
              ))}
            </div>

            {/* Columns list */}
            {displayDays.map((day, colI) => {
              const di = view === "week" ? colI : selectedDay;
              const isToday = di === todayIdx && weekOffset === 0;
              const colEvents = events.filter(e => e.day === di);

              // AI Recommended slot: weekdays 4:00 PM to 5:30 PM if empty
              const isWeekday = di < 5;
              const hasOverlapRecommendation = colEvents.some(e => e.start < 17.5 && e.end > 16.0);
              const showSuggestion = isWeekday && !hasOverlapRecommendation && weekOffset === 0;

              return (
                <div key={day} style={{ position: "relative", borderLeft: "1px solid var(--c-border-1)" }}>
                  
                  {/* Grid Lines */}
                  {HOURS.map(h => (
                    <div key={h} style={{ height: `${HOUR_HEIGHT}px`, borderBottom: "1px solid var(--c-border-0)" }} />
                  ))}

                  {/* Red Time Laser Indicator */}
                  {isToday && currentHour >= START_HOUR && (
                    <div style={{
                      position: "absolute", left: 0, right: 0, top: `${(currentHour - START_HOUR) * HOUR_HEIGHT}px`,
                      height: "1px", background: "var(--c-secondary)", zIndex: 10, pointerEvents: "none"
                    }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--c-secondary)", marginTop: "-2.5px", marginLeft: "-3px" }} />
                    </div>
                  )}

                  {/* Render positioned event cards */}
                  {getPositionedEvents(colEvents).map(({ event: ev, left, width }) => {
                    const c = SUBJECT_COLORS[ev.colorIdx % SUBJECT_COLORS.length];
                    const top = (ev.start - START_HOUR) * HOUR_HEIGHT + 1;
                    const height = Math.max((ev.end - ev.start) * HOUR_HEIGHT - 2, 20);

                    return (
                      <div
                        key={ev.id}
                        onContextMenu={(e) => handleOpenContextMenu(e, ev)}
                        onClick={(e) => handleOpenContextMenu(e, ev)}
                        style={{
                          position: "absolute", left, width, top: `${top}px`, height: `${height}px`,
                          background: c.bg, border: `1px solid ${c.border}`, borderLeft: `2.5px solid ${c.dot}`,
                          borderRadius: "4px", padding: "4px 8px", cursor: "pointer", overflow: "hidden",
                          opacity: ev.done ? 0.5 : 1, zIndex: 5, transition: "all var(--t-fast)",
                          display: "flex", flexDirection: "column", justifyContent: "space-between"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = c.border;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = c.bg;
                        }}
                      >
                        <div>
                          <p style={{ fontSize: "11px", fontWeight: 600, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {ev.done ? "✓ " : ""}{ev.title}
                          </p>
                          {height > 32 && (
                            <p style={{ fontSize: "9px", color: "var(--c-text-secondary)", marginTop: "1px" }}>
                              {fmtHour(ev.start)} – {fmtHour(ev.end)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* AI Recommended study slots overlay */}
                  {showSuggestion && (
                    <div
                      onClick={async () => {
                        const subjects = ["Math Focus", "Physics Revision", "Biology Review", "Chemistry Practice"];
                        const title = subjects[colI % subjects.length];
                        await addEvent({
                          title,
                          day: di,
                          start: 16.0,
                          end: 17.5,
                          done: false,
                          colorIdx: 0
                        });
                      }}
                      style={{
                        position: "absolute", left: "2px", right: "2px", top: `${(16.0 - START_HOUR) * HOUR_HEIGHT + 1}px`, height: `${1.5 * HOUR_HEIGHT - 2}px`,
                        background: "var(--c-accent-dim)", border: "1px dashed var(--c-accent-border)",
                        borderRadius: "var(--r-sm)", padding: "4px", cursor: "pointer", overflow: "hidden",
                        zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center",
                        transition: "all var(--t-fast)"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--c-accent-border)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "var(--c-accent-dim)"; }}
                    >
                      <Sparkles size={11} color="var(--c-accent)" />
                      <span style={{ fontSize: "9.5px", color: "var(--c-accent)", fontWeight: 700, marginTop: "1px" }}>💡 Suggest Study</span>
                      <span style={{ fontSize: "8px", color: "var(--c-text-tertiary)" }}>4:00 PM - 5:30 PM</span>
                    </div>
                  )}

                </div>
              );
            })}

          </div>
        </div>

      </div>

      {/* Floating Context Menu */}
      {contextMenu.event && (() => {
        // Always read completion state from the live `events` array, not the
        // snapshot captured when the menu opened — otherwise "Mark Complete" /
        // "Mark Incomplete" can show a stale label if `done` changes out from
        // under an open menu (e.g. toggled from another tab/device).
        const liveEvent = events.find(e => e.id === contextMenu.event!.id) ?? contextMenu.event;
        return (
        <div
          ref={contextRef}
          style={{
            position: "fixed",
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: "var(--c-surface-1)",
            border: "1px solid var(--c-border-1)",
            borderRadius: "var(--r-md)",
            boxShadow: "var(--sh-lg)",
            padding: "4px",
            zIndex: 300,
            display: "flex",
            flexDirection: "column",
            gap: "1px",
            minWidth: "140px"
          }}
        >
          <button
            onClick={async () => {
              await toggleEventDone(contextMenu.event!.id);
              setContextMenu({ x: 0, y: 0, event: null });
            }}
            style={{
              background: "none", border: "none", color: "var(--c-text-primary)",
              textAlign: "left", padding: "6px 10px", fontSize: "12px", cursor: "pointer",
              borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", gap: "6px"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <Check size={12} color="var(--c-success)" />
            {liveEvent.done ? "Mark Incomplete" : "Mark Completed"}
          </button>
          
          <button
            onClick={() => {
              setEditingEvent(contextMenu.event);
              setShowEdit(true);
              setContextMenu({ x: 0, y: 0, event: null });
            }}
            style={{
              background: "none", border: "none", color: "var(--c-text-primary)",
              textAlign: "left", padding: "6px 10px", fontSize: "12px", cursor: "pointer",
              borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", gap: "6px"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <Edit2 size={11} color="var(--c-text-secondary)" />
            Edit Session
          </button>
          
          <button
            onClick={async () => {
              await removeEvent(contextMenu.event!.id);
              setContextMenu({ x: 0, y: 0, event: null });
            }}
            style={{
              background: "none", border: "none", color: "var(--c-danger)",
              textAlign: "left", padding: "6px 10px", fontSize: "12px", cursor: "pointer",
              borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", gap: "6px"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.04)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <Trash2 size={11} />
            Delete Session
          </button>
        </div>
        );
      })()}

      {/* Add Session Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,17,23,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)" }}>
          <div className="card animate-up" style={{ padding: "24px", width: "360px", background: "var(--c-surface-1)", border: "1px solid var(--c-border-1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--c-text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>Add Study Session</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", display: "flex" }}><X size={18} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="form-label" htmlFor="add-title-input">Session Title</label>
                <input id="add-title-input" className="input" placeholder="e.g. Mathematics Integration" value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} />
              </div>

              <div>
                <label className="form-label" htmlFor="add-day-select">Target Day</label>
                <select id="add-day-select" className="input" value={newEvent.day} onChange={e => setNewEvent(p => ({ ...p, day: +e.target.value }))}>
                  {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label" htmlFor="add-start-time">Start Time</label>
                  <TimeInput id="add-start-time" value={newEvent.start} onChange={v => setNewEvent(p => ({ ...p, start: v }))} />
                </div>
                <div>
                  <label className="form-label" htmlFor="add-end-time">End Time</label>
                  <TimeInput id="add-end-time" value={newEvent.end} onChange={v => setNewEvent(p => ({ ...p, end: v }))} />
                </div>
              </div>

              <div>
                <label className="form-label">Category Theme</label>
                <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                  {SUBJECT_COLORS.map((c, i) => (
                    <button 
                      key={i} 
                      onClick={() => setNewEvent(p => ({ ...p, colorIdx: i }))} 
                      style={{
                        width: "24px", height: "24px", borderRadius: "50%", background: c.dot,
                        border: newEvent.colorIdx === i ? "1.5px solid #fff" : "1.5px solid transparent",
                        cursor: "pointer", transition: "all var(--t-fast)"
                      }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={() => setShowAdd(false)} className="btn btn-secondary" style={{ flex: 1, padding: "8px" }}>Cancel</button>
              <button onClick={handleAddEvent} className="btn btn-primary" style={{ flex: 1, padding: "8px" }} disabled={!newEvent.title.trim()}>Add Session</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {showEdit && editingEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,17,23,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)" }}>
          <div className="card animate-up" style={{ padding: "24px", width: "360px", background: "var(--c-surface-1)", border: "1px solid var(--c-border-1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--c-text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>Edit Study Session</h3>
              <button onClick={() => { setShowEdit(false); setEditingEvent(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", display: "flex" }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="form-label" htmlFor="edit-title-input">Session Title</label>
                <input 
                  id="edit-title-input"
                  required
                  className="input" 
                  value={editingEvent.title} 
                  onChange={e => setEditingEvent(p => p ? ({ ...p, title: e.target.value }) : null)} 
                />
              </div>

              <div>
                <label className="form-label" htmlFor="edit-day-select">Target Day</label>
                <select 
                  id="edit-day-select"
                  className="input" 
                  value={editingEvent.day} 
                  onChange={e => setEditingEvent(p => p ? ({ ...p, day: +e.target.value }) : null)} 
                >
                  {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label" htmlFor="edit-start-hour">Start Time</label>
                  <TimeInput
                    id="edit-start-hour"
                    value={decimalToTimeStr(editingEvent.start)}
                    onChange={v => setEditingEvent(p => p ? ({ ...p, start: timeStrToDecimal(v) }) : null)}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="edit-end-hour">End Time</label>
                  <TimeInput
                    id="edit-end-hour"
                    value={decimalToTimeStr(editingEvent.end)}
                    onChange={v => setEditingEvent(p => p ? ({ ...p, end: timeStrToDecimal(v) }) : null)}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Category Theme</label>
                <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                  {SUBJECT_COLORS.map((c, i) => (
                    <button 
                      key={i} 
                      type="button"
                      onClick={() => setEditingEvent(p => p ? ({ ...p, colorIdx: i }) : null)} 
                      style={{
                        width: "24px", height: "24px", borderRadius: "50%", background: c.dot,
                        border: editingEvent.colorIdx === i ? "1.5px solid #fff" : "1.5px solid transparent",
                        cursor: "pointer", transition: "all var(--t-fast)"
                      }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button type="button" onClick={() => { setShowEdit(false); setEditingEvent(null); }} className="btn btn-secondary" style={{ flex: 1, padding: "8px" }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: "8px" }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
