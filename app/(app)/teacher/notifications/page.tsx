"use client";

import { useEffect } from "react";
import { Bell, Megaphone, User, AlertTriangle } from "lucide-react";
import { useInstitutionStore } from "@/lib/store/institutionStore";

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

export default function TeacherNotificationsPage() {
  const { notifications, isLoading, loadError, loadTeacherData, markNotificationRead } = useInstitutionStore();

  useEffect(() => { loadTeacherData(); }, [loadTeacherData]);

  // This inbox shows notifications received, not sent — RLS lets a sender
  // see their own notifications too (needed elsewhere for "Sent History"),
  // so without this filter a teacher's own submitted requests would show
  // up mixed into their own notification inbox.
  const inbox = notifications.filter(n => n.fromName !== "You");
  const unreadCount = inbox.filter(n => !n.read).length;

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
    <div style={{ maxWidth: "700px", margin: "0 auto" }} className="animate-fade">
      <div style={{ marginBottom: "24px" }}>
        <p className="eyebrow">Teacher Portal</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, marginTop: "4px", color: "var(--c-text-primary)" }}>Notifications</h1>
        <p style={{ fontSize: "13px", color: "var(--c-text-secondary)", marginTop: "4px" }}>
          {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
        </p>
      </div>

      {inbox.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--c-surface-1)", border: "1px dashed var(--c-border-2)", borderRadius: "16px" }}>
          <Bell size={28} color="var(--c-text-tertiary)" style={{ margin: "0 auto 12px auto" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-text-primary)" }}>No notifications yet</p>
          <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "4px" }}>Updates from your admin will show up here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {inbox.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && markNotificationRead(n.id)}
              className={n.read ? "card" : "card card-hover"}
              style={{
                padding: "16px 18px", display: "flex", gap: "14px", alignItems: "flex-start",
                cursor: n.read ? "default" : "pointer",
                background: n.read ? "var(--c-surface-1)" : "var(--c-accent-dim)",
                border: n.read ? "1px solid var(--c-border-1)" : "1px solid var(--c-accent-border)"
              }}
            >
              <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: n.toUserId ? "var(--c-surface-2)" : "var(--c-accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {n.toUserId ? <User size={16} color="var(--c-text-secondary)" /> : <Megaphone size={16} color="var(--c-accent)" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>{n.title}</p>
                  {!n.read && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--c-accent)", flexShrink: 0 }} />}
                </div>
                {n.message && <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "4px" }}>{n.message}</p>}
                <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", marginTop: "6px" }}>From {n.fromName} · {timeAgo(n.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
