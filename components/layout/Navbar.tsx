"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, Search, Menu, X, Calendar, MessageSquare,
  Home as HomeIcon, BarChart2, Settings, User, LogOut,
  Info, AlertTriangle, CheckCircle, Flame, Award,
  BookOpen, Clock, FileText
} from "lucide-react";
import { useUIStore } from "@/lib/store/uiStore";
import { useScheduleStore, OSNotification } from "@/lib/store/scheduleStore";
import { createClient } from "@/lib/supabase/client";

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  "/dashboard":       { title: "Home",           sub: "Your actionable feed today" },
  "/calendar":        { title: "My Schedule",    sub: "Academic planning engine" },
  "/chat":            { title: "AI Assistant",   sub: "Chronova Academic Brain" },
  "/exams":           { title: "Exams",          sub: "Test milestones and readiness" },
  "/progress":        { title: "Progress",       sub: "Consistency & study analytics" },
  "/admin":              { title: "Admin Panel",  sub: "Institution management" },
  "/admin/timetable":    { title: "Timetable",    sub: "Full institution timetable" },
  "/admin/teachers":     { title: "Teachers",     sub: "Manage teaching staff" },
  "/admin/classes":      { title: "Classes",      sub: "Batches & classrooms" },
  "/admin/requests":     { title: "Requests",     sub: "Teacher reschedule & leave requests" },
  "/admin/notifications": { title: "Notifications", sub: "Compose and inbox" },
  "/teacher":            { title: "Dashboard",    sub: "Your teaching day at a glance" },
  "/teacher/schedule":   { title: "My Schedule",  sub: "Your weekly timetable" },
  "/teacher/requests":   { title: "My Requests",  sub: "Reschedule, swap, leave, substitution" },
  "/teacher/notifications": { title: "Notifications", sub: "Updates from your admin" },
  "/settings":           { title: "Settings",     sub: "Preferences & schedule tuning" },
};

function getPageMeta(pathname: string) {
  const exact = PAGE_TITLES[pathname];
  if (exact) return exact;
  for (const [key, val] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(key) && key !== "/") return val;
  }
  return { title: "Chronova OS", sub: "" };
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const meta = getPageMeta(pathname);
  const supabase = createClient();
  
  const toggleSidebar = useUIStore(state => state.toggleSidebar);
  const { 
    events, 
    exams, 
    revisions,
    notifications,
    userName,
    streak,
    markNotificationRead,
    deleteNotification,
    clearAllNotifications
  } = useScheduleStore();

  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Search Results State
  const [dbResults, setDbResults] = useState<{
    subjects: any[];
    notes: any[];
    chatMessages: any[];
  }>({ subjects: [], notes: [], chatMessages: [] });

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowNotifications(false);
    setShowProfile(false);
    setShowSearch(false);
  }, [pathname]);

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showSearch]);

  // Click outside listeners
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape key for search modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowSearch(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search queries across subjects, notes (sessions), and chat history
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setDbResults({ subjects: [], notes: [], chatMessages: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      const q = `%${searchQuery}%`;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Search subjects
      const { data: subs } = await supabase
        .from("subjects")
        .select("*")
        .eq("user_id", user.id)
        .ilike("subject_name", q)
        .limit(4);

      // 2. Search chats
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .ilike("content", q)
        .limit(4);

      // 3. Search notes in sessions table
      const { data: sessionsWithNotes } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .ilike("notes", q)
        .limit(4);

      setDbResults({
        subjects: subs || [],
        chatMessages: messages || [],
        notes: sessionsWithNotes || []
      });
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, supabase]);

  // Client search mappings
  const filteredEvents = searchQuery.trim() === "" ? [] : events.filter(e =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredExams = searchQuery.trim() === "" ? [] : exams.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRevisions = searchQuery.trim() === "" ? [] : revisions.filter(e =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNavigate = (path: string) => {
    router.push(path);
    setShowSearch(false);
    setSearchQuery("");
  };

  // Group notifications helper
  const groupNotifications = (notifs: OSNotification[]) => {
    const urgent: OSNotification[] = [];
    const today: OSNotification[] = [];
    const thisWeek: OSNotification[] = [];
    const completed: OSNotification[] = [];

    notifs.forEach(n => {
      if (n.read) {
        completed.push(n);
        return;
      }
      
      const isUrgent = n.text.toLowerCase().includes("warning") || 
                       n.text.toLowerCase().includes("urgent") || 
                       n.text.toLowerCase().includes("risk") || 
                       n.text.toLowerCase().includes("missed");
                       
      if (isUrgent) {
        urgent.push(n);
        return;
      }

      let isToday = true;
      if (n.time.includes("Yesterday") || n.time.includes("/") || n.time.includes("days ago") || n.time.includes("ago") && (n.time.includes("h") && parseInt(n.time) >= 24)) {
        isToday = false;
      }

      if (isToday) {
        today.push(n);
      } else {
        thisWeek.push(n);
      }
    });

    return { urgent, today, thisWeek, completed };
  };

  const grouped = groupNotifications(notifications);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    for (const n of notifications) {
      if (!n.read) await markNotificationRead(n.id);
    }
  };

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <>
      <header style={{
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid var(--c-border-1)",
        background: "var(--c-surface-0)",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        {/* Left actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={toggleSidebar}
            className="btn btn-icon mobile-menu-btn"
            aria-label="Toggle Menu"
            style={{ border: "none", background: "transparent" }}
          >
            <Menu size={16} />
          </button>

          <div>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              color: "var(--c-text-primary)"
            }}>
              {meta.title}
            </h1>
            {meta.sub && (
              <p style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)", marginTop: "1px" }} className="desktop-only-sub">
                {meta.sub}
              </p>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
          {/* Search Trigger */}
          <button 
            onClick={() => setShowSearch(true)} 
            className="btn btn-icon" 
            aria-label="Search" 
            style={{ border: "none", background: "transparent" }}
          >
            <Search size={15} />
          </button>

          {/* Notifications Dropdown */}
          <div style={{ position: "relative" }}>
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfile(false);
              }} 
              className="btn btn-icon" 
              aria-label="Notifications" 
              style={{ position: "relative", border: "none", background: "transparent" }}
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: "8px", right: "8px",
                  width: "5px", height: "5px", borderRadius: "50%",
                  background: "var(--c-orange)"
                }} />
              )}
            </button>

            {showNotifications && (
              <div 
                ref={notificationsRef}
                style={{
                  position: "absolute", right: 0, top: "38px",
                  width: "340px", background: "var(--c-surface-1)",
                  border: "1px solid var(--c-border-1)", borderRadius: "var(--r-lg)",
                  boxShadow: "var(--sh-lg)",
                  padding: "12px", zIndex: 100, display: "flex", flexDirection: "column", gap: "10px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--c-border-1)", paddingBottom: "8px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: 600, fontFamily: "var(--font-display)" }}>Coaching Alerts ({unreadCount} unread)</h4>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        style={{ background: "none", border: "none", color: "var(--c-accent-light)", fontSize: "10.5px", cursor: "pointer", fontWeight: 500 }}
                      >
                        Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button 
                        onClick={clearAllNotifications}
                        style={{ background: "none", border: "none", color: "var(--c-text-tertiary)", fontSize: "10.5px", cursor: "pointer", fontWeight: 500 }}
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto", paddingRight: "2px" }}>
                  {notifications.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "16px 0", color: "var(--c-text-tertiary)" }}>
                      <p style={{ fontSize: "12px", fontWeight: 500 }}>No coaching logs</p>
                      <p style={{ fontSize: "10.5px", marginTop: "2px" }}>Academic coach will notify you of optimizations.</p>
                    </div>
                  ) : (
                    <>
                      {/* Urgent */}
                      {grouped.urgent.length > 0 && (
                        <div>
                          <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", color: "var(--c-orange)", letterSpacing: "0.05em", marginBottom: "4px" }}>Urgent Actions</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {grouped.urgent.map(n => (
                              <NotificationItem key={n.id} n={n} onRead={() => markNotificationRead(n.id)} onDelete={() => deleteNotification(n.id)} onAction={() => router.push(n.actionType === "recovery" ? "/dashboard" : "/calendar")} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Today */}
                      {grouped.today.length > 0 && (
                        <div style={{ marginTop: "2px" }}>
                          <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", color: "var(--c-accent-light)", letterSpacing: "0.05em", marginBottom: "4px" }}>Today</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {grouped.today.map(n => (
                              <NotificationItem key={n.id} n={n} onRead={() => markNotificationRead(n.id)} onDelete={() => deleteNotification(n.id)} onAction={() => router.push("/calendar")} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* This Week */}
                      {grouped.thisWeek.length > 0 && (
                        <div style={{ marginTop: "2px" }}>
                          <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", color: "var(--c-text-tertiary)", letterSpacing: "0.05em", marginBottom: "4px" }}>This Week</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {grouped.thisWeek.map(n => (
                              <NotificationItem key={n.id} n={n} onRead={() => markNotificationRead(n.id)} onDelete={() => deleteNotification(n.id)} onAction={() => router.push("/calendar")} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Completed / Read */}
                      {grouped.completed.length > 0 && (
                        <div style={{ marginTop: "2px", opacity: 0.6 }}>
                          <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", color: "var(--c-success)", letterSpacing: "0.05em", marginBottom: "4px" }}>Completed Alerts</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {grouped.completed.map(n => (
                              <NotificationItem key={n.id} n={n} onRead={() => {}} onDelete={() => deleteNotification(n.id)} onAction={() => {}} />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ width: "1px", height: "16px", background: "var(--c-border-1)", margin: "0 2px" }} />

          {/* Profile User Dropdown */}
          <div style={{ position: "relative" }}>
            <div 
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: "var(--c-surface-2)",
                border: "1px solid var(--c-border-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 600, color: "var(--c-text-primary)",
                cursor: "pointer",
                transition: "all var(--t-fast)",
              }}
            >
              {userName ? userName[0].toUpperCase() : "U"}
            </div>

            {showProfile && (
              <div 
                ref={profileRef}
                style={{
                  position: "absolute", right: 0, top: "38px",
                  width: "200px", background: "var(--c-surface-1)",
                  border: "1px solid var(--c-border-1)", borderRadius: "var(--r-lg)",
                  boxShadow: "var(--sh-lg)",
                  padding: "10px", zIndex: 100, display: "flex", flexDirection: "column", gap: "8px"
                }}
              >
                <div style={{ borderBottom: "1px solid var(--c-border-1)", paddingBottom: "6px" }}>
                  <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>{userName || "Student"}</p>
                  
                  {streak > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.12)", padding: "2px 6px", borderRadius: "var(--r-sm)" }}>
                      <Flame size={10} color="var(--c-warning)" />
                      <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--c-warning)" }}>{streak} Days Streak</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <button 
                    onClick={() => router.push("/settings")}
                    style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "var(--c-text-secondary)", fontSize: "12px", padding: "4px 6px", cursor: "pointer", borderRadius: "var(--r-sm)", width: "100%", textAlign: "left", transition: "all var(--t-fast)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.color = "var(--c-text-primary)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--c-text-secondary)"; }}
                  >
                    <User size={12} /> Profile Settings
                  </button>
                  <button 
                    onClick={async () => {
                      await supabase.auth.signOut();
                      router.push("/login");
                    }}
                    style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "var(--c-orange)", fontSize: "12px", padding: "4px 6px", cursor: "pointer", borderRadius: "var(--r-sm)", width: "100%", textAlign: "left", transition: "all var(--t-fast)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,63,94,0.04)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                  >
                    <LogOut size={12} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Search Palette */}
      {showSearch && (
        <div 
          onClick={() => setShowSearch(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(15, 17, 23, 0.75)",
            backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", justifyContent: "center",
            paddingTop: "12vh"
          }}
          className="animate-fade"
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              width: "540px", maxWidth: "90%", background: "var(--c-surface-1)",
              border: "1px solid var(--c-border-1)", borderRadius: "var(--r-xl)",
              boxShadow: "var(--sh-lg)", overflow: "hidden", display: "flex", flexDirection: "column",
              height: "fit-content", maxHeight: "65vh"
            }}
            className="animate-up"
          >
            {/* Search Input Box */}
            <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--c-border-1)" }}>
              <Search size={16} color="var(--c-text-tertiary)" style={{ marginRight: "10px", flexShrink: 0 }} />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search subjects, sessions, notes, exams, chats, or calendar..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: "13.5px", color: "var(--c-text-primary)", fontFamily: "var(--font-sans)"
                }}
              />
              <button 
                onClick={() => setShowSearch(false)}
                style={{ background: "none", border: "none", color: "var(--c-text-tertiary)", cursor: "pointer", display: "flex", marginLeft: "10px" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Results Listings */}
            <div style={{ overflowY: "auto", padding: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
              
              {/* Local sessions matching search */}
              {filteredEvents.length > 0 && (
                <div>
                  <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", color: "var(--c-accent-light)", letterSpacing: "0.05em", padding: "0 6px 2px 6px" }}>
                    Calendar Sessions
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    {filteredEvents.map(ev => (
                      <div 
                        key={ev.id}
                        onClick={() => handleNavigate("/calendar")}
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 6px", borderRadius: "var(--r-md)", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <Calendar size={13} color="var(--c-accent-light)" />
                        <span style={{ fontSize: "12.5px", color: "var(--c-text-primary)" }}>{ev.title}</span>
                        <span style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)", marginLeft: "auto" }}>Day {ev.day + 1} ({ev.start}:00)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exams matching search */}
              {filteredExams.length > 0 && (
                <div>
                  <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", color: "var(--c-orange)", letterSpacing: "0.05em", padding: "0 6px 2px 6px" }}>
                    Exams Milestones
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    {filteredExams.map(ex => (
                      <div 
                        key={ex.id}
                        onClick={() => handleNavigate("/exams")}
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 6px", borderRadius: "var(--r-md)", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <Award size={13} color="var(--c-orange)" />
                        <span style={{ fontSize: "12.5px", color: "var(--c-text-primary)" }}>{ex.name} ({ex.subject})</span>
                        <span style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)", marginLeft: "auto" }}>Readiness: {Math.round((ex.completedChapters / ex.chapters) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Database search matching subjects */}
              {dbResults.subjects.length > 0 && (
                <div>
                  <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", color: "var(--c-secondary-light)", letterSpacing: "0.05em", padding: "0 6px 2px 6px" }}>
                    Subjects
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    {dbResults.subjects.map(s => (
                      <div 
                        key={s.id}
                        onClick={() => handleNavigate("/dashboard")}
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 6px", borderRadius: "var(--r-md)", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <BookOpen size={13} color="var(--c-secondary-light)" />
                        <span style={{ fontSize: "12.5px", color: "var(--c-text-primary)" }}>{s.subject_name}</span>
                        <span style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)", marginLeft: "auto" }}>Difficulty: {s.difficulty_level}/5</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spaced Revisions matching search */}
              {filteredRevisions.length > 0 && (
                <div>
                  <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", color: "var(--c-success)", letterSpacing: "0.05em", padding: "0 6px 2px 6px" }}>
                    Spaced Repetition
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    {filteredRevisions.map(rev => (
                      <div 
                        key={rev.id}
                        onClick={() => handleNavigate("/dashboard")}
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 6px", borderRadius: "var(--r-md)", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <Clock size={13} color="var(--c-success)" />
                        <span style={{ fontSize: "12.5px", color: "var(--c-text-primary)" }}>{rev.title}</span>
                        <span style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)", marginLeft: "auto" }}>Retention: {rev.retentionScore}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Message History matching search */}
              {dbResults.chatMessages.length > 0 && (
                <div>
                  <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", color: "var(--c-accent-light)", letterSpacing: "0.05em", padding: "0 6px 2px 6px" }}>
                    AI Conversations
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    {dbResults.chatMessages.map(msg => (
                      <div 
                        key={msg.id}
                        onClick={() => handleNavigate("/chat")}
                        style={{ display: "flex", flexDirection: "column", gap: "3px", padding: "6px", borderRadius: "var(--r-md)", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <MessageSquare size={12} color="var(--c-accent-light)" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--c-text-secondary)" }}>
                            {msg.role === "user" ? "You" : "Chronova AI"}
                          </span>
                          <span style={{ fontSize: "9.5px", color: "var(--c-text-tertiary)", marginLeft: "auto" }}>
                            {new Date(msg.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ fontSize: "11.5px", color: "var(--c-text-tertiary)", paddingLeft: "20px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                           {msg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Session notes matching search */}
              {dbResults.notes.length > 0 && (
                <div>
                  <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", color: "var(--c-text-secondary)", letterSpacing: "0.05em", padding: "0 6px 2px 6px" }}>
                    Study Notes
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    {dbResults.notes.map(n => (
                      <div 
                        key={n.id}
                        onClick={() => handleNavigate("/calendar")}
                        style={{ display: "flex", flexDirection: "column", gap: "3px", padding: "6px", borderRadius: "var(--r-md)", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <FileText size={12} color="var(--c-text-secondary)" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-primary)" }}>Study Session Notes</span>
                          <span style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)", marginLeft: "auto" }}>
                            {n.duration_minutes} min (Focus: {n.focus_score}%)
                          </span>
                        </div>
                        <p style={{ fontSize: "11.5px", color: "var(--c-text-tertiary)", paddingLeft: "20px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {n.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {filteredEvents.length === 0 && filteredExams.length === 0 && filteredRevisions.length === 0 &&
               dbResults.subjects.length === 0 && dbResults.chatMessages.length === 0 && dbResults.notes.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--c-text-tertiary)" }}>
                  <p style={{ fontSize: "12.5px", fontWeight: 500 }}>No results found</p>
                  <p style={{ fontSize: "10.5px", marginTop: "2px" }}>Search across subjects, notes, exams, AI chats, and schedules.</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .mobile-menu-btn { display: none !important; }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .desktop-only-sub { display: none !important; }
        }
      `}</style>
    </>
  );
}

interface NotificationItemProps {
  n: OSNotification;
  onRead: () => void;
  onDelete: () => void;
  onAction: () => void;
}

function NotificationItem({ n, onRead, onDelete, onAction }: NotificationItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "10px 12px", 
        background: "rgba(255,255,255,0.012)",
        border: "1px solid var(--c-border-1)", 
        borderRadius: "8px", 
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "4px"
      }}
    >
      {/* Read/Delete Controls */}
      <div style={{ display: "flex", gap: "6px", position: "absolute", top: "10px", right: "10px", opacity: hovered ? 1 : 0, transition: "opacity var(--t-fast)" }}>
        {!n.read && (
          <button 
            onClick={onRead} 
            title="Mark Read"
            style={{ background: "none", border: "none", color: "var(--c-success)", cursor: "pointer", fontSize: "10px", fontWeight: 700 }}
          >
            Read
          </button>
        )}
        <button 
          onClick={onDelete} 
          title="Delete"
          style={{ background: "none", border: "none", color: "var(--c-danger)", cursor: "pointer", fontSize: "10px", fontWeight: 700 }}
        >
          Delete
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", paddingRight: "50px" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "12.5px", color: "var(--c-text-primary)", fontWeight: 650, lineHeight: 1.35 }}>
            {n.text}
          </p>
          <span style={{ fontSize: "9px", color: "var(--c-text-tertiary)", marginTop: "4px", display: "inline-block" }}>
            {n.time}
          </span>
        </div>
      </div>

      {n.actionText && (
        <button 
          onClick={onAction}
          style={{
            alignSelf: "flex-start",
            background: "var(--c-accent-dim)",
            border: "1px solid var(--c-accent-border)",
            borderRadius: "6px",
            color: "var(--c-accent-light)",
            fontSize: "11px",
            fontWeight: 650,
            padding: "4px 10px",
            cursor: "pointer",
            marginTop: "6px",
            transition: "all var(--t-fast)"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--c-accent-dim)"}
        >
          {n.actionText}
        </button>
      )}
    </div>
  );
}
