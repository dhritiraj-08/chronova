"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useInstitutionStore } from "@/lib/store/institutionStore";
import { Calendar, ClipboardList, Bell, AlertTriangle, BookOpen, ChevronRight, CalendarDays, CalendarClock } from "lucide-react";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TeacherDashboardPage() {
  const { institution, timetable, teacherRequests, notifications, isLoading, loadError, loadTeacherData } = useInstitutionStore();

  useEffect(() => { loadTeacherData(); }, [loadTeacherData]);

  const todayName = DAY_NAMES[new Date().getDay()];
  const todayClasses = timetable.filter(t => t.dayOfWeek === todayName).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const upcomingWeek = timetable.length;
  const pendingRequests = teacherRequests.filter(r => r.status === "pending").length;
  // Exclude notifications this teacher sent themselves (e.g. their own
  // "New teacher request" broadcast to the admin) — RLS lets a sender see
  // their own notifications, but those were never "received".
  const unreadNotifications = notifications.filter(n => !n.read && n.fromName !== "You").length;

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", color: "var(--c-text-secondary)" }}>
        <div style={{ fontSize: "14px", fontWeight: 600 }}>Loading your dashboard...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: "380px" }}>
          <AlertTriangle size={28} color="var(--c-danger)" style={{ margin: "0 auto 12px auto" }} />
          <p style={{ fontSize: "13.5px", color: "var(--c-text-secondary)" }}>{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }} className="animate-fade">
      <div style={{ marginBottom: "24px" }}>
        <p className="eyebrow">Teacher Portal</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 700, marginTop: "4px", color: "var(--c-text-primary)" }}>
          {institution?.name || "My Dashboard"}
        </h1>
        <p style={{ color: "var(--c-text-secondary)", marginTop: "4px" }}>Here's what's on your plate today.</p>
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        {[
          { label: "Today's Classes", value: todayClasses.length, icon: CalendarClock, color: "#3B82F6", textColor: "#1D4ED8", href: "/teacher/schedule" },
          { label: "This Week", value: upcomingWeek, icon: CalendarDays, color: "#10B981", textColor: "#047857", href: "/teacher/schedule" },
          { label: "Pending Requests", value: pendingRequests, icon: ClipboardList, color: "#F97316", textColor: "#B45309", href: "/teacher/requests" },
          { label: "Unread Notifications", value: unreadNotifications, icon: Bell, color: "#8B5CF6", textColor: "#7C3AED", href: "/teacher/notifications" },
        ].map(({ label, value, icon: Icon, color, textColor, href }) => (
          <Link key={label} href={href} style={{ textDecoration: "none" }}>
            <div className="card card-hover" style={{ padding: "20px", boxShadow: "var(--sh-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: "11.5px", color: "var(--c-text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "10px" }}>{label}</p>
                  <p style={{ fontSize: "32px", fontWeight: 800, color: textColor, fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{value}</p>
                </div>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={19} color={color} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Today's schedule */}
      <div className="card" style={{ padding: "24px", marginBottom: "20px", boxShadow: "var(--sh-sm)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={16} color="var(--c-text-secondary)" />
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--c-text-primary)" }}>{todayName}'s Schedule</h2>
          </div>
          <Link href="/teacher/schedule" style={{ fontSize: "12.5px", color: "var(--c-accent-dark)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
            Full week <ChevronRight size={13} />
          </Link>
        </div>

        {todayClasses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 24px" }}>
            <BookOpen size={24} color="var(--c-text-tertiary)" style={{ margin: "0 auto 10px auto" }} />
            <p style={{ fontSize: "13px", color: "var(--c-text-secondary)" }}>No classes scheduled for you today. Enjoy the break!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {todayClasses.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 14px", background: "var(--c-surface-0)", borderRadius: "var(--r-md)", border: "1px solid var(--c-border-1)" }}>
                <div style={{ width: "8px", height: "40px", borderRadius: "4px", background: "var(--c-accent)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>{c.subjectName}</p>
                  <p style={{ fontSize: "12px", color: "var(--c-text-secondary)", marginTop: "2px" }}>{c.batchName} · {c.classroomName}</p>
                </div>
                <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--c-text-secondary)", flexShrink: 0 }}>{c.startTime} – {c.endTime}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="mobile-column-flex">
        <Link href="/teacher/requests" style={{ textDecoration: "none" }}>
          <div className="card card-hover" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--c-orange-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ClipboardList size={17} color="var(--c-orange)" />
            </div>
            <div>
              <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>Submit a Request</p>
              <p style={{ fontSize: "11.5px", color: "var(--c-text-secondary)", marginTop: "2px" }}>Reschedule, swap, leave, or substitution</p>
            </div>
          </div>
        </Link>
        <Link href="/teacher/notifications" style={{ textDecoration: "none" }}>
          <div className="card card-hover" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--c-accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bell size={17} color="var(--c-accent)" />
            </div>
            <div>
              <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>Check Notifications</p>
              <p style={{ fontSize: "11.5px", color: "var(--c-text-secondary)", marginTop: "2px" }}>Updates from your admin</p>
            </div>
          </div>
        </Link>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-column-flex { display: flex !important; flex-direction: column !important; }
        }
      `}</style>
    </div>
  );
}
