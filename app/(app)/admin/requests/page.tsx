"use client";

import { useEffect, useState } from "react";
import { Check, X, Clock, RefreshCw, Users, CalendarOff, UserPlus2, AlertTriangle } from "lucide-react";
import { useInstitutionStore, TeacherRequestType } from "@/lib/store/institutionStore";

const TYPE_META: Record<TeacherRequestType, { label: string; icon: any; color: string }> = {
  reschedule: { label: "Reschedule", icon: RefreshCw, color: "#3b82f6" },
  swap: { label: "Class Swap", icon: Users, color: "#8b5cf6" },
  leave: { label: "Leave", icon: CalendarOff, color: "#f97316" },
  substitution: { label: "Substitution", icon: UserPlus2, color: "#10b981" }
};

function formatDetails(details: Record<string, any>): string {
  const parts: string[] = [];
  if (details.date) parts.push(`Date: ${details.date}`);
  if (details.reason) parts.push(`Reason: ${details.reason}`);
  if (details.fromTime && details.toTime) parts.push(`${details.fromTime} → ${details.toTime}`);
  if (details.note) parts.push(details.note);
  return parts.length > 0 ? parts.join(" · ") : "No additional details provided.";
}

export default function AdminRequestsPage() {
  const { teacherRequests, isLoading, loadError, loadAdminData, approveRequest, rejectRequest } = useInstitutionStore();
  const [tab, setTab] = useState<"pending" | "resolved">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { loadAdminData(); }, [loadAdminData]);

  const pending = teacherRequests.filter(r => r.status === "pending");
  const resolved = teacherRequests.filter(r => r.status !== "pending");
  const visible = tab === "pending" ? pending : resolved;

  async function handleApprove(id: string) {
    setBusyId(id);
    await approveRequest(id);
    setBusyId(null);
  }
  async function handleReject(id: string) {
    setBusyId(id);
    await rejectRequest(id);
    setBusyId(null);
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
    <div style={{ maxWidth: "900px", margin: "0 auto" }} className="animate-fade">
      <div style={{ marginBottom: "24px" }}>
        <p className="eyebrow">Administration</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, marginTop: "4px", color: "var(--c-text-primary)" }}>Teacher Requests</h1>
        <p style={{ fontSize: "13px", color: "var(--c-text-secondary)", marginTop: "4px" }}>Review and respond to reschedule, swap, leave, and substitution requests.</p>
      </div>

      <div style={{ display: "flex", background: "var(--c-surface-2)", borderRadius: "12px", padding: "4px", marginBottom: "20px", gap: "4px", width: "fit-content" }}>
        {(["pending", "resolved"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
            fontSize: "14px", fontWeight: 600, transition: "all 0.2s",
            background: tab === t ? "var(--c-surface-1)" : "transparent",
            color: tab === t ? "var(--c-accent-dark)" : "var(--c-text-tertiary)",
            boxShadow: tab === t ? "var(--sh-sm)" : "none"
          }}>
            {t === "pending" ? `Pending (${pending.length})` : `Resolved (${resolved.length})`}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--c-surface-1)", border: "1px dashed var(--c-border-2)", borderRadius: "16px" }}>
          <Clock size={28} color="var(--c-text-tertiary)" style={{ margin: "0 auto 12px auto" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-text-primary)" }}>
            {tab === "pending" ? "No pending requests" : "No resolved requests yet"}
          </p>
          <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "4px" }}>
            {tab === "pending" ? "You're all caught up." : "Approved and rejected requests will show up here."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {visible.map((r) => {
            const meta = TYPE_META[r.type] || TYPE_META.reschedule;
            const Icon = meta.icon;
            return (
              <div key={r.id} className="card card-hover" style={{ padding: "18px 20px", borderLeft: r.status === "pending" ? `3px solid ${meta.color}` : "1px solid var(--c-border-1)", boxShadow: "var(--sh-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${meta.color}1A`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={16} color={meta.color} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <p style={{ fontWeight: 700, fontSize: "14.5px", color: "var(--c-text-primary)" }}>{r.teacherName}</p>
                        <span className="badge badge-accent" style={{ fontSize: "10.5px" }}>{meta.label}</span>
                      </div>
                      <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "6px" }}>{formatDetails(r.details)}</p>
                      <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", marginTop: "6px" }}>
                        Submitted {new Date(r.createdAt).toLocaleDateString()}
                        {r.resolvedAt && ` · Resolved ${new Date(r.resolvedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>

                  {r.status === "pending" ? (
                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={busyId === r.id}
                        className="btn btn-secondary"
                        style={{ fontSize: "12px", padding: "7px 12px", color: "var(--c-danger)", borderColor: "var(--c-danger-border)" }}
                      >
                        <X size={13} /> Reject
                      </button>
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={busyId === r.id}
                        className="btn btn-primary"
                        style={{ fontSize: "12px", padding: "7px 12px" }}
                      >
                        <Check size={13} /> Approve
                      </button>
                    </div>
                  ) : (
                    <span className={r.status === "approved" ? "badge badge-green" : "badge"} style={{ fontSize: "11px", flexShrink: 0, ...(r.status === "rejected" ? { background: "var(--c-danger-dim)", color: "#B91C1C", border: "1px solid var(--c-danger-border)" } : {}) }}>
                      {r.status === "approved" ? <Check size={11} /> : <X size={11} />} {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
