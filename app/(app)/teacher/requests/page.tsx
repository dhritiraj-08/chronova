"use client";

import { useEffect, useState } from "react";
import { Send, Check, X, Clock, RefreshCw, Users, CalendarOff, UserPlus2, AlertTriangle } from "lucide-react";
import { useInstitutionStore, TeacherRequestType } from "@/lib/store/institutionStore";

// `color` is for the icon and background tint only — used directly as this
// button's active-state TEXT color it fails 4.5:1 (verified live), so
// `textColor` is a separately darkened literal for that label instead.
const TYPE_META: Record<TeacherRequestType, { label: string; icon: any; color: string; textColor: string; hint: string }> = {
  reschedule: { label: "Reschedule", icon: RefreshCw, color: "#3b82f6", textColor: "#1D4ED8", hint: "Move a class to a different day or time" },
  swap: { label: "Class Swap", icon: Users, color: "#8b5cf6", textColor: "#6D28D9", hint: "Trade a class slot with another teacher" },
  leave: { label: "Leave", icon: CalendarOff, color: "#f97316", textColor: "#B45309", hint: "Request a day off" },
  substitution: { label: "Substitution", icon: UserPlus2, color: "#10b981", textColor: "#047857", hint: "Ask for someone to cover a class" }
};

function formatDetails(details: Record<string, any>): string {
  const parts: string[] = [];
  if (details.className) parts.push(details.className);
  if (details.date) parts.push(`Date: ${details.date}`);
  if (details.reason) parts.push(`Reason: ${details.reason}`);
  return parts.length > 0 ? parts.join(" · ") : "No additional details provided.";
}

export default function TeacherRequestsPage() {
  const { timetable, teacherRequests, isLoading, loadError, loadTeacherData, submitTeacherRequest } = useInstitutionStore();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<TeacherRequestType>("reschedule");
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadTeacherData(); }, [loadTeacherData]);

  async function handleSubmit() {
    if (!reason.trim()) return;
    setSubmitting(true);
    const cls = timetable.find(t => t.id === classId);
    await submitTeacherRequest({
      type,
      details: {
        classId: classId || undefined,
        className: cls ? `${cls.subjectName} — ${cls.batchName} (${cls.dayOfWeek} ${cls.startTime})` : undefined,
        date: date || undefined,
        reason
      }
    });
    setSubmitting(false);
    setShowForm(false);
    setClassId(""); setDate(""); setReason(""); setType("reschedule");
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", color: "var(--c-text-secondary)" }}>
        <div style={{ fontSize: "13px", fontWeight: 500 }}>Loading requests...</div>
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
    <div style={{ maxWidth: "800px", margin: "0 auto" }} className="animate-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <p className="eyebrow">Teacher Portal</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, marginTop: "4px", color: "var(--c-text-primary)" }}>My Requests</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary"><Send size={15} /> New Request</button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: "22px", marginBottom: "22px", boxShadow: "var(--sh-sm)" }}>
          <div style={{ marginBottom: "16px" }}>
            <label className="form-label" style={{ marginBottom: "8px" }}>Request Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }} className="mobile-column-flex">
              {(Object.keys(TYPE_META) as TeacherRequestType[]).map(t => {
                const meta = TYPE_META[t];
                const Icon = meta.icon;
                const active = type === t;
                return (
                  <button key={t} type="button" onClick={() => setType(t)} style={{
                    padding: "10px 8px", borderRadius: "10px", cursor: "pointer", textAlign: "center",
                    border: active ? `1px solid ${meta.color}` : "1px solid var(--c-border-1)",
                    background: active ? `${meta.color}14` : "var(--c-surface-0)"
                  }}>
                    <Icon size={16} color={active ? meta.color : "var(--c-text-tertiary)"} style={{ margin: "0 auto 4px auto", display: "block" }} />
                    <span style={{ fontSize: "11px", fontWeight: 600, color: active ? meta.textColor : "var(--c-text-secondary)" }}>{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--c-text-tertiary)", marginTop: "8px" }}>{TYPE_META[type].hint}</p>
          </div>

          {timetable.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <label className="form-label">Related Class (optional)</label>
              <select className="input" value={classId} onChange={e => setClassId(e.target.value)}>
                <option value="">None / not class-specific</option>
                {timetable.map(t => (
                  <option key={t.id} value={t.id}>{t.subjectName} — {t.batchName} ({t.dayOfWeek} {t.startTime})</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "14px", marginBottom: "18px" }}>
            <div>
              <label className="form-label">Date</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Reason</label>
              <textarea className="input" rows={3} placeholder="Explain your request..." value={reason} onChange={e => setReason(e.target.value)} style={{ resize: "vertical", fontFamily: "inherit" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || !reason.trim()} className="btn btn-primary">
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      )}

      {teacherRequests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--c-surface-1)", border: "1px dashed var(--c-border-2)", borderRadius: "16px" }}>
          <Clock size={28} color="var(--c-text-tertiary)" style={{ margin: "0 auto 12px auto" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-text-primary)" }}>No requests yet</p>
          <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "4px" }}>Submit a reschedule, swap, leave, or substitution request.</p>
          <button onClick={() => setShowForm(true)} className="btn btn-secondary" style={{ marginTop: "16px", fontSize: "12.5px" }}>
            <Send size={13} /> New Request
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {teacherRequests.map(r => {
            const meta = TYPE_META[r.type] || TYPE_META.reschedule;
            const Icon = meta.icon;
            return (
              <div key={r.id} className="card card-hover" style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", borderLeft: r.status === "pending" ? `3px solid ${meta.color}` : "1px solid var(--c-border-1)", boxShadow: "var(--sh-sm)" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: `${meta.color}1A`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={15} color={meta.color} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--c-text-primary)" }}>{meta.label}</p>
                    <p style={{ fontSize: "12px", color: "var(--c-text-secondary)", marginTop: "4px" }}>{formatDetails(r.details)}</p>
                    <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", marginTop: "5px" }}>Submitted {new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={r.status === "approved" ? "badge badge-green" : r.status === "rejected" ? "badge" : "badge badge-accent"} style={{ fontSize: "11px", flexShrink: 0, ...(r.status === "rejected" ? { background: "var(--c-danger-dim)", color: "#B91C1C", border: "1px solid var(--c-danger-border)" } : {}) }}>
                  {r.status === "approved" ? <Check size={11} /> : r.status === "rejected" ? <X size={11} /> : <Clock size={11} />} {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-column-flex { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
