"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useInstitutionStore } from "@/lib/store/institutionStore";
import {
  Building2, Users, BookOpen, DoorOpen, ChevronRight, Sparkles,
  CheckCircle, AlertTriangle, Bell, ClipboardList, LayoutGrid, GraduationCap
} from "lucide-react";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AdminPage() {
  const {
    institution, teachers, classrooms, batches, timetable, teacherRequests, notifications,
    isLoading, loadError, loadAdminData, generateTimetableForBatch
  } = useInstitutionStore();

  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatedOk, setGeneratedOk] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (!selectedBatchId && batches.length > 0) setSelectedBatchId(batches[0].id);
  }, [batches, selectedBatchId]);

  const subjectCount = new Set(teachers.flatMap(t => t.subjects)).size;
  const pendingRequests = teacherRequests.filter(r => r.status === "pending").length;
  // Exclude notifications the admin sent themselves — RLS lets a sender
  // see their own notifications (needed for /admin/notifications' "Sent
  // History"), but those were never "received" so they should never count
  // toward "things you haven't read yet".
  const unreadNotifications = notifications.filter(n => !n.read && n.fromName !== "You").length;

  const todayName = DAY_NAMES[new Date().getDay()];
  const previewBatch = batches.find(b => b.id === selectedBatchId) || batches[0];
  const previewEntries = previewBatch
    ? timetable.filter(t => t.batchId === previewBatch.id && t.dayOfWeek === todayName)
    : [];

  // `color` (the app's --c-orange / --c-secondary / --c-success / --c-warning
  // tokens, kept as literal hex so the icon badge's `${color}22` translucent-
  // background trick works) is only ever used for the icon and its badge —
  // those tokens are tuned as bright accents and fail 4.5:1 as small text.
  // `textColor` is a separately darkened, contrast-verified literal used for
  // the number and "Manage" label instead.
  const STATS = [
    { label: "Teachers", value: teachers.length, icon: Users, color: "#F97316", textColor: "#B45309", href: "/admin/teachers" },
    { label: "Batches", value: batches.length, icon: LayoutGrid, color: "#3B82F6", textColor: "#1D4ED8", href: "/admin/classes" },
    { label: "Subjects", value: subjectCount, icon: BookOpen, color: "#10B981", textColor: "#047857", href: "/admin/teachers" },
    { label: "Classrooms", value: classrooms.length, icon: DoorOpen, color: "#F59E0B", textColor: "#92400E", href: "/admin/classes" },
  ];

  async function handleGenerate() {
    if (!selectedBatchId) return;
    setGenerating(true);
    setGenerateError("");
    setGeneratedOk(false);
    const result = await generateTimetableForBatch(selectedBatchId);
    setGenerating(false);
    if (result.error) setGenerateError(result.error);
    else setGeneratedOk(true);
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", color: "var(--c-text-secondary)" }}>
        <div style={{ fontSize: "14px", fontWeight: 600 }}>Loading Institution Panel...</div>
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
    <div style={{ maxWidth: "1200px", margin: "0 auto" }} className="animate-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "28px" }}>
        <div>
          <p className="eyebrow">Administration</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 700, marginTop: "4px", color: "var(--c-text-primary)" }}>
            {institution?.name || "Institution Panel"}
          </h1>
          <p style={{ color: "var(--c-text-secondary)", marginTop: "4px" }}>
            Manage your {institution?.type || "school"}'s timetables, teachers, and classrooms
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/admin/requests" style={{ textDecoration: "none" }}>
            <button className="btn btn-secondary" style={{ fontSize: "13px", position: "relative" }}>
              <ClipboardList size={14} /> Requests
              {pendingRequests > 0 && (
                <span style={{ marginLeft: "6px", background: "var(--c-danger)", color: "white", fontSize: "10.5px", fontWeight: 700, borderRadius: "999px", padding: "1px 6px" }}>
                  {pendingRequests}
                </span>
              )}
            </button>
          </Link>
          <Link href="/admin/notifications" style={{ textDecoration: "none" }}>
            <button className="btn btn-secondary" style={{ fontSize: "13px", position: "relative" }}>
              <Bell size={14} /> Notifications
              {unreadNotifications > 0 && (
                <span style={{ marginLeft: "6px", background: "var(--c-accent)", color: "white", fontSize: "10.5px", fontWeight: 700, borderRadius: "999px", padding: "1px 6px" }}>
                  {unreadNotifications}
                </span>
              )}
            </button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        {STATS.map(({ label, value, icon: Icon, color, textColor, href }) => (
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
              <p style={{ fontSize: "12px", color: textColor, marginTop: "10px", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                Manage <ChevronRight size={12} />
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* AI Generate section */}
      <div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "12px",
              background: "linear-gradient(135deg, #f97316, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Sparkles size={22} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--c-text-primary)" }}>Timetable Generator</h2>
              <p style={{ fontSize: "13px", color: "var(--c-text-secondary)", marginTop: "2px" }}>
                Auto-assign teachers and classrooms across the week for a batch
              </p>
            </div>
          </div>
          {batches.length > 0 ? (
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <select className="input" style={{ width: "auto" }} value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)}>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button onClick={handleGenerate} disabled={generating} className="btn btn-primary" style={{ padding: "10px 18px", fontSize: "14px" }}>
                {generating ? (
                  <>
                    <span style={{ width: "16px", height: "16px", border: "2px solid var(--c-accent-border)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
                    Generating...
                  </>
                ) : (
                  <>Generate</>
                )}
              </button>
            </div>
          ) : (
            <Link href="/admin/classes" style={{ fontSize: "13px", color: "var(--c-accent-dark)", textDecoration: "none", fontWeight: 600 }}>
              Add a batch first →
            </Link>
          )}
        </div>
        {generateError && (
          <p style={{ fontSize: "12.5px", color: "#B91C1C", marginTop: "14px" }}>{generateError}</p>
        )}
        {generatedOk && (
          <p style={{ fontSize: "12.5px", color: "#047857", marginTop: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle size={13} /> Timetable generated and teachers notified.
          </p>
        )}
      </div>

      {/* Timetable Preview */}
      <div className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--c-text-primary)" }}>{todayName}'s Timetable Preview</h2>
            <p style={{ fontSize: "13px", color: "var(--c-text-secondary)", marginTop: "2px" }}>{previewBatch?.name || "No batches yet"}</p>
          </div>
          {previewEntries.length > 0 && <span className="badge badge-green"><CheckCircle size={12} /> {previewEntries.length} sessions today</span>}
        </div>

        {previewEntries.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <GraduationCap size={26} color="var(--c-text-tertiary)" style={{ margin: "0 auto 12px auto" }} />
            <p style={{ fontSize: "13px", color: "var(--c-text-secondary)", maxWidth: "320px", margin: "0 auto", lineHeight: 1.5 }}>
              {batches.length === 0
                ? "Add a batch and generate a timetable to see a preview here."
                : `No sessions scheduled for ${previewBatch?.name} today.`}
            </p>
            {batches.length === 0 && (
              <Link href="/admin/classes" style={{ textDecoration: "none" }}>
                <button className="btn btn-secondary" style={{ marginTop: "16px", fontSize: "12.5px" }}>
                  <LayoutGrid size={13} /> Add Your First Batch
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px" }}>
              <thead>
                <tr>
                  {["Time Slot", "Subject", "Teacher", "Classroom"].map((h) => (
                    <th key={h} style={{
                      padding: "10px 16px", textAlign: "left",
                      fontSize: "12px", color: "var(--c-text-tertiary)",
                      fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewEntries.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((row, i) => (
                  <tr key={row.id}>
                    {[`${row.startTime}–${row.endTime}`, row.subjectName, row.teacherName, row.classroomName].map((cell, j) => (
                      <td key={j} style={{
                        padding: "12px 16px",
                        background: i % 2 === 0 ? "var(--c-surface-0)" : "transparent",
                        borderRadius: j === 0 ? "10px 0 0 10px" : j === 3 ? "0 10px 10px 0" : "0",
                        fontSize: "14px",
                        color: j === 1 ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                        fontWeight: j === 1 ? 600 : 400,
                      }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "20px" }} className="mobile-column-flex">
        {[
          { href: "/admin/teachers", icon: Users, color: "#F97316", title: "Manage Teachers", desc: "Invite staff, edit subjects and availability" },
          { href: "/admin/classes", icon: Building2, color: "#3B82F6", title: "Manage Classes", desc: "Batches, classrooms, and capacity" },
          { href: "/admin/timetable", icon: GraduationCap, color: "var(--c-accent-dark)", title: "Full Timetable", desc: "Every session, every batch, one grid" },
        ].map(({ href, icon: Icon, color, title, desc }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div className="card card-hover" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: color.startsWith("#") ? `${color}18` : "var(--c-accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={17} color={color} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>{title}</p>
                <p style={{ fontSize: "11.5px", color: "var(--c-text-secondary)", marginTop: "2px" }} className="truncate">{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-column-flex { display: flex !important; flex-direction: column !important; }
        }
      `}</style>
    </div>
  );
}
