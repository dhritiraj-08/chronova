"use client";

import { useEffect, useMemo } from "react";
import { useInstitutionStore } from "@/lib/store/institutionStore";
import { Calendar, AlertTriangle } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PALETTE = ["#f97316", "#10b981", "#ec4899", "#3b82f6", "#06b6d4", "#8b5cf6", "#eab308"];

export default function TeacherSchedulePage() {
  const { timetable, isLoading, loadError, loadTeacherData } = useInstitutionStore();

  useEffect(() => { loadTeacherData(); }, [loadTeacherData]);

  const subjectColor = useMemo(() => {
    const subjects = Array.from(new Set(timetable.map(e => e.subjectName))).sort();
    const map = new Map<string, string>();
    subjects.forEach((s, i) => map.set(s, PALETTE[i % PALETTE.length]));
    return map;
  }, [timetable]);

  const timeSlots = useMemo(() => {
    const set = new Map<string, string>();
    timetable.forEach(e => set.set(`${e.startTime}-${e.endTime}`, `${e.startTime}–${e.endTime}`));
    return Array.from(set.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [timetable]);

  const entryAt = (day: string, key: string) => timetable.find(e => e.dayOfWeek === day && `${e.startTime}-${e.endTime}` === key);

  const totalWeeklyHours = timetable.reduce((acc, e) => {
    const [sh, sm] = e.startTime.split(":").map(Number);
    const [eh, em] = e.endTime.split(":").map(Number);
    return acc + ((eh + em / 60) - (sh + sm / 60));
  }, 0);

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", color: "var(--c-text-secondary)" }}>
        <div style={{ fontSize: "13px", fontWeight: 500 }}>Loading your schedule...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: "360px" }}>
          <AlertTriangle size={28} color="var(--c-danger)" style={{ margin: "0 auto 12px auto" }} />
          <p style={{ fontSize: "13.5px", color: "var(--c-text-secondary)" }}>{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }} className="animate-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <p className="eyebrow">Teacher Portal</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, marginTop: "4px", color: "var(--c-text-primary)" }}>My Schedule</h1>
          <p style={{ fontSize: "13px", color: "var(--c-text-secondary)", marginTop: "4px" }}>{timetable.length} sessions · {totalWeeklyHours.toFixed(1)}h this week</p>
        </div>
      </div>

      {timetable.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--c-surface-1)", border: "1px dashed var(--c-border-2)", borderRadius: "16px" }}>
          <Calendar size={28} color="var(--c-text-tertiary)" style={{ margin: "0 auto 12px auto" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-text-primary)" }}>No classes assigned yet</p>
          <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "4px" }}>Your admin hasn't added you to a timetable yet.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ overflow: "auto", boxShadow: "var(--sh-sm)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--c-border-1)", background: "var(--c-surface-0)" }}>
                  <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "11px", color: "var(--c-text-tertiary)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", width: "120px" }}>Time</th>
                  {DAYS.map(day => (
                    <th key={day} style={{ padding: "14px 16px", textAlign: "center", fontSize: "12.5px", color: "var(--c-text-primary)", fontWeight: 700 }}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(([key, label], rowIdx) => (
                  <tr key={key} style={{ borderBottom: "1px solid var(--c-border-0)", background: rowIdx % 2 === 1 ? "var(--c-surface-0)" : "transparent" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: "12px", color: "var(--c-text-tertiary)", fontWeight: 600 }}>{label}</span>
                    </td>
                    {DAYS.map(day => {
                      const entry = entryAt(day, key);
                      const color = entry ? (subjectColor.get(entry.subjectName) || "#6b7280") : undefined;
                      return (
                        <td key={day} style={{ padding: "6px 8px", textAlign: "center" }}>
                          {entry ? (
                            <div style={{ padding: "10px 8px", borderRadius: "10px", background: `${color}18`, border: `1px solid ${color}40`, borderLeft: `3px solid ${color}` }}>
                              <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--c-text-primary)" }}>{entry.subjectName}</p>
                              <p style={{ fontSize: "11px", color: "var(--c-text-secondary)", marginTop: "3px" }}>{entry.batchName}</p>
                              <p style={{ fontSize: "10px", color: "var(--c-text-tertiary)", marginTop: "2px" }}>{entry.classroomName}</p>
                            </div>
                          ) : (
                            <div style={{ padding: "10px", borderRadius: "10px", background: "var(--c-surface-0)" }}>
                              <span style={{ fontSize: "12px", color: "var(--c-text-tertiary)" }}>—</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ padding: "18px 20px", marginTop: "16px" }}>
            <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", marginBottom: "12px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Subject Legend</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {Array.from(subjectColor.entries()).map(([name, color]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "999px", background: `${color}15`, border: `1px solid ${color}30` }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
                  <span style={{ fontSize: "13px", color: "var(--c-text-primary)" }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
