"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Calendar, Sparkles, GraduationCap, BarChart2,
  Building2, Settings, ChevronLeft, ChevronRight, Flame,
  ClipboardList, Bell, Users, LayoutGrid
} from "lucide-react";
import { useState, useEffect } from "react";
import { LogoMark } from "@/components/Logo";
import { useUIStore } from "@/lib/store/uiStore";
import { useScheduleStore } from "@/lib/store/scheduleStore";
import { createClient } from "@/lib/supabase/client";
import { resolveUserRole } from "@/lib/auth/resolveRole";

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", icon: Home, label: "Home" },
      { href: "/calendar",  icon: Calendar, label: "My Schedule" },
      { href: "/chat",      icon: Sparkles, label: "AI Assistant" },
      { href: "/exams",     icon: GraduationCap, label: "Exams" },
      { href: "/progress",  icon: BarChart2, label: "Progress" },
    ],
  },
  {
    label: "Institution",
    items: [
      { href: "/admin",              icon: Building2,      label: "Admin Panel" },
      { href: "/admin/timetable",    icon: GraduationCap,  label: "Timetable" },
      { href: "/admin/teachers",     icon: Users,          label: "Teachers" },
      { href: "/admin/classes",      icon: LayoutGrid,     label: "Classes" },
      { href: "/admin/requests",     icon: ClipboardList,  label: "Requests" },
      { href: "/admin/notifications", icon: Bell,          label: "Notifications" },
    ],
  },
  {
    label: "Teacher",
    items: [
      { href: "/teacher",              icon: Home,          label: "Dashboard" },
      { href: "/teacher/schedule",     icon: Calendar,      label: "My Schedule" },
      { href: "/teacher/requests",     icon: ClipboardList, label: "My Requests" },
      { href: "/teacher/notifications", icon: Bell,         label: "Notifications" },
    ],
  },
];

const BOTTOM_ITEMS = [
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { 
    sidebarOpen, 
    setSidebarOpen, 
    sidebarCollapsed, 
    toggleSidebarCollapsed, 
    setSidebarCollapsed 
  } = useUIStore();
  
  const { userName, level, streak, loadFromDatabase } = useScheduleStore();
  const [role, setRole] = useState<"student" | "admin" | "teacher">("student");

  const collapsed = sidebarCollapsed;

  useEffect(() => {
    loadFromDatabase();
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") {
      setSidebarCollapsed(true);
    }
  }, [loadFromDatabase, setSidebarCollapsed]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      // Shared with /login and the (app) layout's route guard — all three
      // must agree on a user's role, or the sidebar could show one role's
      // nav while the layout enforces a different one.
      setRole(await resolveUserRole(supabase, user));
    });
  }, [pathname]);

  const visibleSections = NAV_SECTIONS.filter(({ label }) => {
    if (role === "admin") return label === "Institution";
    if (role === "teacher") return label === "Teacher";
    return label === "Workspace";
  });

  // Close sidebar drawer on pathname change (navigation)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const W = collapsed ? 60 : 200;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15,17,23,0.7)",
            zIndex: 998,
            backdropFilter: "blur(4px)",
            transition: "opacity 0.2s ease"
          }}
          className="mobile-only-overlay"
        />
      )}

      <aside
        className={`sidebar-aside ${sidebarOpen ? "mobile-drawer-open" : ""}`}
        style={{
          width: `${W}px`,
          minHeight: "100vh",
          background: "var(--c-surface-0)",
          borderRight: "1px solid var(--c-border-1)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.15s cubic-bezier(0.4, 0, 0.2, 1), left 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          flexShrink: 0,
          position: "relative",
          zIndex: 999,
        }}
      >
        {/* Workspace Switcher / User Header */}
        <div style={{
          height: "56px",
          display: "flex",
          alignItems: "center",
          padding: collapsed ? "0" : "0 12px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: "1px solid var(--c-border-1)",
          flexShrink: 0,
          gap: "8px"
        }}>
          <div style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: "var(--c-surface-1)",
            border: "1px solid var(--c-border-1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <LogoMark size={18} />
          </div>
          {!collapsed && (
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--c-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {userName || "Student"}
              </span>
              <span style={{ fontSize: "10.5px", color: "var(--c-text-secondary)", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                Lvl {level} {streak > 0 && `• 🔥 ${streak}d`}
              </span>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav style={{ flex: 1, padding: "12px 6px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
          {visibleSections.map(({ label, items }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {!collapsed && (
                <p style={{
                  fontSize: "9px", fontWeight: 600, letterSpacing: "0.05em",
                  textTransform: "uppercase", color: "var(--c-text-secondary)",
                  padding: "0 6px", marginBottom: "2px"
                }}>{label}</p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {items.map(({ href, icon: Icon, label: itemLabel }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      data-tooltip={collapsed ? itemLabel : undefined}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 8px",
                        borderRadius: "var(--r-md)",
                        textDecoration: "none",
                        transition: "all var(--t-fast)",
                        background: active ? "var(--c-surface-1)" : "transparent",
                        border: active ? "1px solid var(--c-border-1)" : "1px solid transparent",
                        color: active ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                        fontWeight: active ? 500 : 400,
                        fontSize: "12.5px",
                        whiteSpace: "nowrap",
                        justifyContent: collapsed ? "center" : "flex-start",
                      }}
                      onMouseEnter={e => { 
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.02)";
                          (e.currentTarget as HTMLElement).style.color = "var(--c-text-primary)";
                        }
                      }}
                      onMouseLeave={e => { 
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                          (e.currentTarget as HTMLElement).style.color = "var(--c-text-secondary)";
                        }
                      }}
                    >
                      <Icon
                        size={15}
                        style={{ 
                          flexShrink: 0, 
                          color: active ? "var(--c-text-primary)" : "var(--c-text-tertiary)",
                          transition: "color var(--t-fast)"
                        }}
                      />
                      {!collapsed && <span>{itemLabel}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom items */}
        <div style={{ padding: "6px", borderTop: "1px solid var(--c-border-1)" }}>
          {BOTTOM_ITEMS.map(({ href, icon: Icon, label: itemLabel }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                data-tooltip={collapsed ? itemLabel : undefined}
                style={{
                  display: "flex", alignItems: "center",
                  gap: "8px", padding: "6px 8px",
                  borderRadius: "var(--r-md)", textDecoration: "none",
                  transition: "all var(--t-fast)",
                  background: active ? "var(--c-surface-1)" : "transparent",
                  border: active ? "1px solid var(--c-border-1)" : "1px solid transparent",
                  color: active ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                  fontSize: "12.5px", justifyContent: collapsed ? "center" : "flex-start",
                  fontWeight: active ? 500 : 400,
                }}
                onMouseEnter={e => { 
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.02)";
                    (e.currentTarget as HTMLElement).style.color = "var(--c-text-primary)";
                  }
                }}
                onMouseLeave={e => { 
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--c-text-secondary)";
                  }
                }}
              >
                <Icon size={15} style={{ flexShrink: 0, color: active ? "var(--c-text-primary)" : "var(--c-text-tertiary)" }} />
                {!collapsed && <span>{itemLabel}</span>}
              </Link>
            );
          })}

          {/* Collapse toggle */}
          <button
            onClick={toggleSidebarCollapsed}
            style={{
              marginTop: "2px",
              width: "100%", padding: "6px 8px",
              display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
              gap: "8px",
              background: "transparent", border: "none", cursor: "pointer",
              borderRadius: "var(--r-md)", transition: "all var(--t-fast)",
              color: "var(--c-text-secondary)", fontSize: "12.5px",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
              (e.currentTarget as HTMLElement).style.color = "var(--c-text-primary)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--c-text-secondary)";
            }}
          >
            {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      <style jsx global>{`
        @media (max-width: 768px) {
          .sidebar-aside {
            position: fixed !important;
            top: 0 !important;
            left: -200px !important;
            z-index: 999 !important;
            width: 200px !important;
            height: 100vh !important;
          }
          .sidebar-aside.mobile-drawer-open {
            left: 0 !important;
          }
          .mobile-only-overlay {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
