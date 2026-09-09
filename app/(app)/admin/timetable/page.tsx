"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle, Download, Plus, Trash2, X, Sparkles, AlertTriangle, Calendar } from "lucide-react";
import { useInstitutionStore } from "@/lib/store/institutionStore";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PALETTE = ["#f97316", "#10b981", "#ec4899", "#3b82f6", "#06b6d4", "#8b5cf6", "#eab308"];

const emptyForm = { subjectName: "", teacherId: "", classroomId: "", dayOfWeek: "Monday", startTime: "09:00", endTime: "10:00" };

export default function TimetablePage() {
  const {
    batches, teachers, classrooms, timetable, isLoading, loadError,
    loadAdminData, addTimetableEntry, removeTimetableEntry, generateTimetableForBatch
  } = useInstitutionStore();

  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  useEffect(() => { loadAdminData(); }, [loadAdminData]);
  useEffect(() => {
    if (!selectedBatchId && batches.length > 0) setSelectedBatchId(batches[0].id);
  }, [batches, selectedBatchId]);

  const batchEntries = useMemo(
    () => timetable.filter(t => t.batchId === selectedBatchId),
    [timetable, selectedBatchId]
  );

  // Subject -> stable color, derived from the sorted subject name list so
  // colors stay consistent across renders without storing a color per row.
  const subjectColor = useMemo(() => {
    const subjects = Array.from(new Set(batchEntries.map(e => e.subjectName))).sort();
    const map = new Map<string, string>();
    subjects.forEach((s, i) => map.set(s, PALETTE[i % PALETTE.length]));
    return map;
  }, [batchEntries]);

  // Time slots present in this batch's timetable, sorted.
  const timeSlots = useMemo(() => {
    const set = new Map<string, string>(); // "start-end" -> label
    batchEntries.forEach(e => set.set(`${e.startTime}-${e.endTime}`, `${e.startTime}–${e.endTime}`));
    return Array.from(set.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [batchEntries]);

  const entryAt = (day: string, key: string) =>
    batchEntries.find(e => e.dayOfWeek === day && `${e.startTime}-${e.endTime}` === key);

  async function handleGenerate() {
    if (!selectedBatchId) return;
    setGenerating(true);
    setGenError("");
    const result = await generateTimetableForBatch(selectedBatchId);
    setGenerating(false);
    if (result.error) setGenError(result.error);
  }

  async function handleAddEntry() {
    if (!selectedBatchId || !form.subjectName || !form.startTime || !form.endTime) return;
    await addTimetableEntry({
      batchId: selectedBatchId,
      teacherId: form.teacherId || null,
      classroomId: form.classroomId || null,
      subjectName: form.subjectName,
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime
    });
    setForm(emptyForm);
    setShowAdd(false);
  }

  function exportToPDF() {
    const batch = batches.find(b => b.id === selectedBatchId);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Failed to open print window. Please allow popups for this site.");
      return;
    }

    const legendSubjects = Array.from(subjectColor.entries());

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${batch?.name || "Timetable"} - Timetable</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap');
            @page { size: A4 landscape; margin: 15mm; }
            body { font-family: 'Inter', sans-serif; color: #111827; background-color: #ffffff; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .header { margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title-section h1 { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; margin: 0 0 6px 0; color: #0f172a; letter-spacing: -0.02em; }
            .title-section p { font-size: 13px; color: #4b5563; margin: 0; font-weight: 500; }
            .meta-section { text-align: right; font-size: 12px; color: #6b7280; }
            .meta-section p { margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 12px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #374151; letter-spacing: 0.05em; }
            td { border: 1px solid #e5e7eb; padding: 8px; vertical-align: middle; height: 70px; width: 17%; }
            td.time-col { background-color: #f9fafb; font-weight: 600; font-size: 11px; color: #4b5563; width: 12%; text-align: center; padding: 8px; }
            .cell-content { border-radius: 6px; padding: 8px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
            .subject { font-size: 12px; font-weight: 700; margin: 0 0 3px 0; color: #1f2937; }
            .teacher { font-size: 10px; color: #4b5563; margin: 0 0 2px 0; font-weight: 500; }
            .room { font-size: 9px; color: #6b7280; margin: 0; font-weight: 600; text-transform: uppercase; }
            .empty-cell { font-size: 12px; color: #d1d5db; text-align: center; }
            .legend { display: flex; flex-wrap: wrap; gap: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
            .legend-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #4b5563; letter-spacing: 0.05em; width: 100%; margin-bottom: 8px; }
            .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 500; color: #374151; }
            .legend-color { width: 10px; height: 10px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title-section">
              <h1>Weekly Timetable</h1>
              <p>${batch?.name || ""} &middot; Chronova AI Optimizer</p>
            </div>
            <div class="meta-section">
              <p>Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <table>
            <thead><tr><th>Time Slot</th>${DAYS.map(d => `<th>${d}</th>`).join("")}</tr></thead>
            <tbody>
              ${timeSlots.map(([key, label]) => `
                <tr>
                  <td class="time-col">${label}</td>
                  ${DAYS.map(day => {
                    const entry = entryAt(day, key);
                    if (entry) {
                      const color = subjectColor.get(entry.subjectName) || "#6b7280";
                      return `<td><div class="cell-content" style="background-color:${color}15;border-left:3px solid ${color};">
                        <p class="subject">${entry.subjectName}</p>
                        <p class="teacher">${entry.teacherName}</p>
                        <p class="room">${entry.classroomName}</p>
                      </div></td>`;
                    }
                    return `<td><div class="empty-cell">—</div></td>`;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="legend">
            <div class="legend-title">Subject Legend</div>
            ${legendSubjects.map(([name, color]) => `<div class="legend-item"><div class="legend-color" style="background-color:${color};"></div><span>${name}</span></div>`).join("")}
          </div>
          <script>
            window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", color: "var(--c-text-secondary)" }}>
        <div style={{ fontSize: "13px", fontWeight: 500 }}>Loading timetable...</div>
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

  if (batches.length === 0) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <p className="eyebrow">Administration</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, marginTop: "4px", marginBottom: "20px", color: "var(--c-text-primary)" }}>Full Timetable</h1>
        <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--c-surface-1)", border: "1px dashed var(--c-border-2)", borderRadius: "16px" }}>
          <Calendar size={26} color="var(--c-text-tertiary)" style={{ margin: "0 auto 12px auto" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-text-primary)" }}>No batches yet</p>
          <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "4px" }}>Add a batch on the Classes page before building a timetable.</p>
          <Link href="/admin/classes" style={{ textDecoration: "none" }}>
            <button className="btn btn-secondary" style={{ marginTop: "16px", fontSize: "12.5px" }}>Go to Classes</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }} className="animate-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <p className="eyebrow">Administration</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, marginTop: "4px", color: "var(--c-text-primary)" }}>Full Timetable</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
            <CheckCircle size={14} color="var(--c-success)" />
            <span style={{ fontSize: "13px", color: "#047857" }}>{batchEntries.length} sessions scheduled</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <select className="input" value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} style={{ width: "auto" }}>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)} className="btn btn-secondary" style={{ fontSize: "13px" }}>
            <Plus size={14} /> Add Session
          </button>
          <button onClick={handleGenerate} disabled={generating} className="btn btn-secondary" style={{ fontSize: "13px" }}>
            <Sparkles size={14} /> {generating ? "Generating..." : "Regenerate"}
          </button>
          <button onClick={exportToPDF} className="btn btn-secondary" style={{ fontSize: "13px" }}>
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {genError && (
        <div className="alert alert-error" style={{ padding: "8px 12px", fontSize: "12px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
          <AlertTriangle size={13} /> {genError}
        </div>
      )}

      {showAdd && (
        <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--c-text-primary)" }}>Add Session</h3>
            <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)" }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label className="form-label">Subject</label>
              <input className="input" placeholder="e.g. Physics" value={form.subjectName} onChange={e => setForm({ ...form, subjectName: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Day</label>
              <select className="input" value={form.dayOfWeek} onChange={e => setForm({ ...form, dayOfWeek: e.target.value })}>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label className="form-label">Teacher</label>
              <select className="input" value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}>
                <option value="">Unassigned</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Classroom</label>
              <select className="input" value={form.classroomId} onChange={e => setForm({ ...form, classroomId: e.target.value })}>
                <option value="">TBD</option>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", marginBottom: "18px" }}>
            <div>
              <label className="form-label">Start</label>
              <input type="time" className="input" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <label className="form-label">End</label>
              <input type="time" className="input" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setShowAdd(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleAddEntry} disabled={!form.subjectName} className="btn btn-primary">Add Session</button>
          </div>
        </div>
      )}

      {batchEntries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--c-surface-1)", border: "1px dashed var(--c-border-2)", borderRadius: "16px" }}>
          <Calendar size={26} color="var(--c-text-tertiary)" style={{ margin: "0 auto 12px auto" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-text-primary)" }}>No sessions scheduled for this batch yet</p>
          <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "4px" }}>Add a session manually, or generate a full week automatically.</p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "18px" }}>
            <button onClick={() => setShowAdd(true)} className="btn btn-secondary" style={{ fontSize: "12.5px" }}><Plus size={13} /> Add Session</button>
            <button onClick={handleGenerate} disabled={generating} className="btn btn-primary" style={{ fontSize: "12.5px" }}><Sparkles size={13} /> {generating ? "Generating..." : "Generate Automatically"}</button>
          </div>
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
                            <div style={{ position: "relative", padding: "10px 8px", borderRadius: "10px", background: `${color}18`, border: `1px solid ${color}40`, borderLeft: `3px solid ${color}` }} className="timetable-cell">
                              <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--c-text-primary)" }}>{entry.subjectName}</p>
                              <p style={{ fontSize: "11px", color: "var(--c-text-secondary)", marginTop: "3px" }}>{entry.teacherName}</p>
                              <p style={{ fontSize: "10px", color: "var(--c-text-tertiary)", marginTop: "2px" }}>{entry.classroomName}</p>
                              <button
                                onClick={() => removeTimetableEntry(entry.id)}
                                className="timetable-cell-remove"
                                style={{ position: "absolute", top: "4px", right: "4px", background: "var(--c-surface-1)", border: "1px solid var(--c-border-1)", borderRadius: "6px", cursor: "pointer", color: "var(--c-danger)", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0 }}
                                title="Remove session"
                              >
                                <Trash2 size={10} />
                              </button>
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

      <style jsx global>{`
        .timetable-cell:hover .timetable-cell-remove {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
