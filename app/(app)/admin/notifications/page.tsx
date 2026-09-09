"use client";

import { useEffect, useState } from "react";
import { Send, Bell, Users, User, Megaphone, AlertTriangle } from "lucide-react";
import { useInstitutionStore, NotificationRoleTarget } from "@/lib/store/institutionStore";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AdminNotificationsPage() {
  const { teachers, notifications, isLoading, loadError, loadAdminData, sendNotification, markNotificationRead } = useInstitutionStore();
  const [target, setTarget] = useState<"all-teachers" | string>("all-teachers");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);

  useEffect(() => { loadAdminData(); }, [loadAdminData]);

  async function handleSend() {
    if (!title.trim()) return;
    setSending(true);
    setSentOk(false);
    if (target === "all-teachers") {
      await sendNotification({ toUserId: null, roleTarget: "teacher", title, message });
    } else {
      const teacher = teachers.find(t => t.id === target);
      await sendNotification({ toUserId: teacher?.userId || null, roleTarget: "teacher" as NotificationRoleTarget, title, message });
    }
    setSending(false);
    setSentOk(true);
    setTitle("");
    setMessage("");
    setTimeout(() => setSentOk(false), 3000);
  }

  // Only show notifications this admin actually sent (from_user_id set, role_target teacher/all)
  // so this page reads as "what I've broadcast", not the admin's own inbox.
  // fromName is set to "You" specifically when from_user_id matches the
  // currently-loaded user (see fetchNotifications in the store) — using it
  // here filters to notifications the admin actually sent, not every
  // notification with any known sender (which previously included ones
  // teachers sent TO the admin, like "New teacher request").
  const sentHistory = notifications.filter(n => n.fromName === "You");
  // The flip side: notifications addressed TO the admin (e.g. a teacher's
  // "New teacher request" broadcast) — without this, the unread badge on
  // /admin has nowhere for the admin to actually go read/clear it.
  const inbox = notifications.filter(n => n.fromName !== "You");
  const unreadInboxCount = inbox.filter(n => !n.read).length;

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", color: "var(--c-text-secondary)" }}>
        <div style={{ fontSize: "13px", fontWeight: 500 }}>Loading notifications...</div>
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
      <div style={{ marginBottom: "24px" }}>
        <p className="eyebrow">Administration</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, marginTop: "4px", color: "var(--c-text-primary)" }}>Notifications</h1>
        <p style={{ fontSize: "13px", color: "var(--c-text-secondary)", marginTop: "4px" }}>Send updates to all teachers, or message one directly.</p>
      </div>

      <div className="card" style={{ padding: "22px", marginBottom: "28px", boxShadow: "var(--sh-sm)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Megaphone size={15} color="var(--c-text-secondary)" />
          <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>Compose</h3>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label className="form-label">Send To</label>
          <select className="input" value={target} onChange={e => setTarget(e.target.value)}>
            <option value="all-teachers">All Teachers</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: "14px" }}>
          <label className="form-label">Title</label>
          <input className="input" placeholder="e.g. Staff meeting moved to Friday" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div style={{ marginBottom: "18px" }}>
          <label className="form-label">Message (optional)</label>
          <textarea className="input" rows={3} placeholder="Add any extra detail..." value={message} onChange={e => setMessage(e.target.value)} style={{ resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={handleSend} disabled={sending || !title.trim()} className="btn btn-primary">
            <Send size={14} /> {sending ? "Sending..." : "Send Notification"}
          </button>
          {sentOk && <span style={{ fontSize: "12.5px", color: "#047857", fontWeight: 600 }}>Sent ✓</span>}
        </div>
      </div>

      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Bell size={15} color="var(--c-text-secondary)" />
          <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>
            Inbox {unreadInboxCount > 0 && <span style={{ color: "var(--c-accent-dark)" }}>({unreadInboxCount} unread)</span>}
          </h3>
        </div>
        {inbox.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 24px", background: "var(--c-surface-1)", border: "1px dashed var(--c-border-2)", borderRadius: "16px" }}>
            <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)" }}>Requests and updates from teachers will show up here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {inbox.map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && markNotificationRead(n.id)}
                className={n.read ? "card" : "card card-hover"}
                style={{
                  padding: "14px 16px", display: "flex", gap: "12px", alignItems: "flex-start",
                  cursor: n.read ? "default" : "pointer",
                  background: n.read ? "var(--c-surface-1)" : "var(--c-accent-dim)",
                  border: n.read ? "1px solid var(--c-border-1)" : "1px solid var(--c-accent-border)"
                }}
              >
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "var(--c-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <User size={14} color="var(--c-text-secondary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--c-text-primary)" }}>{n.title}</p>
                    {!n.read && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--c-accent)", flexShrink: 0 }} />}
                  </div>
                  {n.message && <p style={{ fontSize: "12px", color: "var(--c-text-secondary)", marginTop: "3px" }}>{n.message}</p>}
                  <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", marginTop: "5px" }}>From {n.fromName} · {timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--c-border-1)", paddingTop: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Bell size={15} color="var(--c-text-secondary)" />
          <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>Sent History</h3>
        </div>
        {sentHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 24px", background: "var(--c-surface-1)", border: "1px dashed var(--c-border-2)", borderRadius: "16px" }}>
            <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)" }}>Notifications you send will show up here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {sentHistory.map(n => (
              <div key={n.id} className="card" style={{ padding: "14px 16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "var(--c-accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {n.toUserId ? <User size={14} color="var(--c-accent)" /> : <Users size={14} color="var(--c-accent)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--c-text-primary)" }}>{n.title}</p>
                  {n.message && <p style={{ fontSize: "12px", color: "var(--c-text-secondary)", marginTop: "3px" }}>{n.message}</p>}
                  <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", marginTop: "5px" }}>
                    To {n.toUserId ? (teachers.find(t => t.userId === n.toUserId)?.name || "a teacher") : "all teachers"} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
