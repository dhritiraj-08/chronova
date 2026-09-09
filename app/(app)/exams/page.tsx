"use client";

import { useState, useEffect } from "react";
import { Plus, X, Calendar, BookOpen, AlertCircle, Trash2, Sparkles, Check, ChevronRight, Clock, MapPin, Award, Upload, Image as ImageIcon, FileText, Loader2, ArrowLeft } from "lucide-react";
import { useScheduleStore, Exam } from "@/lib/store/scheduleStore";
import { createClient } from "@/lib/supabase/client";
import { TimeInput } from "@/components/TimeInput";

// "14:30" -> "2:30 PM"
function fmtTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr || "00";
  if (isNaN(h)) return time;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m} ${ampm}`;
}

// 150 -> "2h 30m", 60 -> "1h", 45 -> "45m"
function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// One exam entry parsed by AI from an uploaded image/text timetable, staged
// in the "Upload Exam Schedule" preview before the student confirms which
// ones to actually create.
interface ParsedExamEntry {
  name: string;
  subject: string;
  date: string;
  examTime?: string;
  venue?: string;
  durationMinutes?: number;
  selected: boolean;
}

export default function ExamsPage() {
  const { 
    exams, 
    addExam, 
    removeExam, 
    toggleChapterCompleted, 
    generateRevisionPlan,
    loadFromDatabase,
    isLoading
  } = useScheduleStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    loadFromDatabase();
    // Load student's subjects from database for the dropdown selection
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("subjects")
          .select("subject_name")
          .eq("user_id", user.id)
          .then(({ data }) => {
            if (data) {
              const names = data.map((s) => s.subject_name);
              setSubjectsList(names.length > 0 ? names : ["Mathematics", "Physics", "Chemistry", "Biology"]);
            }
          });
      }
    });
  }, [loadFromDatabase, supabase]);

  const [newExam, setNewExam] = useState({
    name: "",
    subject: "Mathematics",
    date: "",
    endDate: "",
    examTime: "",
    durationMinutes: 180,
    venue: "",
    examType: "Final Exam" as "Internal Assessment" | "Final Exam" | "Mid-term" | "Quiz" | "Practical",
    totalMarks: "" as string | number,
    chapters: 8,
    priority: "Medium" as "Low" | "Medium" | "High"
  });

  // Keep the selected subject in sync with the real subjects list once it loads.
  // Without this, the <select> can visually display the first real subject
  // (because "Mathematics" isn't one of its <option>s) while newExam.subject
  // silently stays "Mathematics" underneath — so the exam gets saved with a
  // subject the user never actually chose.
  useEffect(() => {
    if (subjectsList.length > 0 && !subjectsList.includes(newExam.subject)) {
      setNewExam((p) => ({ ...p, subject: subjectsList[0] }));
    }
  }, [subjectsList, newExam.subject]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.name || !newExam.date) return;
    await addExam({
      name: newExam.name,
      subject: newExam.subject,
      date: newExam.date,
      endDate: newExam.endDate || undefined,
      chapters: newExam.chapters,
      completedChapters: 0,
      priority: newExam.priority,
      examTime: newExam.examTime || undefined,
      durationMinutes: newExam.durationMinutes || undefined,
      venue: newExam.venue || undefined,
      examType: newExam.examType,
      totalMarks: newExam.totalMarks === "" ? undefined : Number(newExam.totalMarks)
    });
    setNewExam({
      name: "",
      subject: subjectsList[0] || "Mathematics",
      date: "",
      endDate: "",
      examTime: "",
      durationMinutes: 180,
      venue: "",
      examType: "Final Exam",
      totalMarks: "",
      chapters: 8,
      priority: "Medium"
    });
    setShowAddModal(false);
  };

  // ── Upload Exam Schedule (image or pasted text → AI-parsed exam entries) ──
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<"image" | "text">("image");
  const [uploadImageDataUrl, setUploadImageDataUrl] = useState("");
  const [uploadImageMime, setUploadImageMime] = useState("");
  const [uploadText, setUploadText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parsedEntries, setParsedEntries] = useState<ParsedExamEntry[] | null>(null);
  const [confirmingImport, setConfirmingImport] = useState(false);

  function resetUploadState() {
    setUploadMode("image");
    setUploadImageDataUrl("");
    setUploadImageMime("");
    setUploadText("");
    setParsing(false);
    setParseError("");
    setParsedEntries(null);
    setConfirmingImport(false);
  }

  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setParseError("Please choose an image file (JPG or PNG).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setParseError("That image is too large — please use a file under 8MB.");
      return;
    }
    setParseError("");
    const reader = new FileReader();
    reader.onload = () => setUploadImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    setUploadImageMime(file.type);
  }

  async function handleParse() {
    setParseError("");
    setParsedEntries(null);

    const body: any = {};
    if (uploadMode === "image") {
      if (!uploadImageDataUrl) { setParseError("Choose an image first."); return; }
      body.imageBase64 = uploadImageDataUrl.split(",")[1] || "";
      body.mimeType = uploadImageMime;
      if (uploadText.trim()) body.text = uploadText.trim();
    } else {
      if (!uploadText.trim()) { setParseError("Paste the exam schedule text first."); return; }
      body.text = uploadText.trim();
    }

    setParsing(true);
    try {
      const res = await fetch("/api/exams/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error || "Couldn't parse that. Please try again.");
        return;
      }
      const entries: ParsedExamEntry[] = (data.exams || [])
        .map((e: any) => ({
          name: e.name || e.subject || "Exam",
          subject: e.subject || e.name || "General",
          date: e.date || "",
          examTime: e.examTime || "",
          venue: e.venue || "",
          durationMinutes: e.durationMinutes ?? undefined,
          selected: true,
        }))
        .filter((e: ParsedExamEntry) => e.date); // drop entries with no usable date
      if (entries.length === 0) {
        setParseError("No exam entries with a readable date were found. Try a clearer image, or paste the schedule as text instead.");
      }
      setParsedEntries(entries);
    } catch (err: any) {
      setParseError(err.message || "Something went wrong while parsing.");
    } finally {
      setParsing(false);
    }
  }

  function toggleParsedEntry(idx: number) {
    setParsedEntries(prev => prev ? prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e) : prev);
  }

  async function handleConfirmImport() {
    if (!parsedEntries) return;
    const toAdd = parsedEntries.filter(e => e.selected);
    if (toAdd.length === 0) return;
    setConfirmingImport(true);
    for (const entry of toAdd) {
      await addExam({
        name: entry.name,
        subject: entry.subject,
        date: entry.date,
        chapters: 8,
        completedChapters: 0,
        priority: "Medium",
        examTime: entry.examTime || undefined,
        durationMinutes: entry.durationMinutes || undefined,
        venue: entry.venue || undefined,
        examType: "Final Exam",
      });
    }
    setConfirmingImport(false);
    setShowUploadModal(false);
    resetUploadState();
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", color: "var(--c-text-secondary)" }}>
        <div style={{ fontSize: "14px", fontWeight: 600 }}>Loading Exam OS...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }} className="animate-fade">
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 800, color: "var(--c-text-primary)", letterSpacing: "-0.025em" }}>
            Exams & Milestones
          </h1>
          <p style={{ color: "var(--c-text-secondary)", marginTop: "4px" }}>
            Track chapter readiness, countdown dates, and activate AI revision plans.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            id="upload-exam-schedule-btn"
            onClick={() => { resetUploadState(); setShowUploadModal(true); }}
            className="btn btn-secondary"
            style={{ fontSize: "13.5px", padding: "10px 20px" }}
          >
            <Upload size={15} style={{ marginRight: "4px" }} /> Upload Exam Schedule
          </button>
          <button
            id="add-exam-btn"
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ fontSize: "13.5px", padding: "10px 20px" }}
          >
            <Plus size={15} style={{ marginRight: "4px" }} /> Add Exam
          </button>
        </div>
      </div>

      {exams.length === 0 ? (
        /* Empty State */
        <div style={{
          textAlign: "center",
          padding: "80px 40px",
          background: "var(--c-surface-1)",
          border: "1px dashed var(--c-border-2)",
          borderRadius: "16px"
        }}>
          <AlertCircle size={40} color="var(--c-text-tertiary)" style={{ margin: "0 auto 16px auto" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--c-text-primary)" }}>No upcoming exams</h3>
          <p style={{ fontSize: "13px", color: "var(--c-text-secondary)", marginTop: "4px", maxWidth: "380px", margin: "4px auto 0 auto" }}>
            Add your first exam syllabus here, and let Chronova build revision milestone slots automatically.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
            <button
              onClick={() => { resetUploadState(); setShowUploadModal(true); }}
              className="btn btn-secondary"
              style={{ fontSize: "13px" }}
            >
              <Upload size={13} style={{ marginRight: "4px" }} /> Upload Exam Schedule
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
              style={{ fontSize: "13px" }}
            >
              Create Exam Plan
            </button>
          </div>
        </div>
      ) : (
        /* Exams Grid */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
          {exams.map((exam) => {
            const daysRemaining = Math.max(0, Math.ceil((new Date(exam.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
            const readiness = Math.round((exam.completedChapters / exam.chapters) * 100);
            const remainingChapters = exam.chapters - exam.completedChapters;
            const recommendedHours = remainingChapters * 3; // 3 hours per chapter

            // Risk Level Assessment
            let riskLevel: "High" | "Medium" | "Low" = "Low";
            let riskColor = "#047857";
            let riskBg = "var(--c-success-dim)";
            let riskBorder = "var(--c-success-border)";

            if (daysRemaining < remainingChapters || (daysRemaining <= 7 && readiness < 75)) {
              riskLevel = "High";
              riskColor = "#B91C1C";
              riskBg = "var(--c-danger-dim)";
              riskBorder = "var(--c-danger-border)";
            } else if (readiness < 50 && daysRemaining < 14) {
              riskLevel = "Medium";
              riskColor = "#B45309";
              riskBg = "var(--c-orange-dim)";
              riskBorder = "var(--c-orange-border)";
            }

            // Circular progress math
            const radius = 28;
            const circ = 2 * Math.PI * radius;
            const strokeDashoffset = circ - (readiness / 100) * circ;

            return (
              <div 
                key={exam.id} 
                className="card card-hover" 
                style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "var(--sh-sm)" }}
              >
                {/* Header section with Circular Ring and Titles */}
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  
                  {/* circular progress ring */}
                  <div style={{ position: "relative", width: "68px", height: "68px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="68" height="68" viewBox="0 0 70 70" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="35" cy="35" r={radius} stroke="var(--c-surface-2)" strokeWidth="5.5" fill="transparent" />
                      <circle cx="35" cy="35" r={radius} stroke="var(--c-accent)" strokeWidth="5.5" fill="transparent"
                        strokeDasharray={circ} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.4s" }} />
                    </svg>
                    <div style={{ position: "absolute", textAlign: "center" }}>
                      <span style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--c-text-primary)" }}>{readiness}%</span>
                      <p style={{ fontSize: "7px", color: "var(--c-text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>Ready</p>
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: "9px",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        border: `1px solid ${exam.priority === "High" ? "var(--c-orange-border)" : "var(--c-border-1)"}`,
                        background: exam.priority === "High" ? "var(--c-orange-dim)" : "var(--c-surface-2)",
                        color: exam.priority === "High" ? "var(--c-orange)" : "var(--c-text-secondary)"
                      }}>
                        {exam.priority} Priority
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--c-text-tertiary)", fontWeight: 600 }} className="truncate">
                        {exam.subject}
                      </span>
                    </div>
                    
                    <h3 style={{ fontSize: "16px", fontWeight: 750, color: "var(--c-text-primary)", fontFamily: "var(--font-display)", marginTop: "4px", letterSpacing: "-0.01em" }} className="truncate">
                      {exam.name}
                    </h3>
                    
                    <p style={{ fontSize: "11px", color: "var(--c-text-secondary)", marginTop: "2px" }}>
                      {exam.date}{exam.endDate ? ` – ${exam.endDate}` : ""} • <strong style={{ color: daysRemaining <= 3 ? "#B91C1C" : "var(--c-text-primary)" }}>{daysRemaining} days left</strong>
                    </p>
                  </div>
                </div>

                {/* Exam detail chips: type, time, venue, marks */}
                {(exam.examType || exam.examTime || exam.venue || exam.totalMarks) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {exam.examType && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10.5px", fontWeight: 600, color: "var(--c-text-secondary)", background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", borderRadius: "var(--r-md)", padding: "3px 8px" }}>
                        <BookOpen size={10} /> {exam.examType}
                      </span>
                    )}
                    {exam.examTime && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10.5px", fontWeight: 600, color: "var(--c-text-secondary)", background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", borderRadius: "var(--r-md)", padding: "3px 8px" }}>
                        <Clock size={10} /> {fmtTime(exam.examTime)}{exam.durationMinutes ? ` (${fmtDuration(exam.durationMinutes)})` : ""}
                      </span>
                    )}
                    {exam.venue && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10.5px", fontWeight: 600, color: "var(--c-text-secondary)", background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", borderRadius: "var(--r-md)", padding: "3px 8px" }}>
                        <MapPin size={10} /> {exam.venue}
                      </span>
                    )}
                    {exam.totalMarks && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10.5px", fontWeight: 600, color: "var(--c-text-secondary)", background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", borderRadius: "var(--r-md)", padding: "3px 8px" }}>
                        <Award size={10} /> {exam.totalMarks} marks
                      </span>
                    )}
                  </div>
                )}

                {/* Readiness parameters and risk info */}
                <div style={{ borderTop: "1px solid var(--c-border-1)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  
                  {/* Dynamic Risk level indicator badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--c-text-secondary)", fontWeight: 500 }}>Risk Assessment:</span>
                    <span style={{
                      fontSize: "9.5px", padding: "2px 8px", borderRadius: "var(--r-md)", fontWeight: 700, textTransform: "uppercase",
                      background: riskBg, color: riskColor, border: `1px solid ${riskBorder}`
                    }}>
                      {riskLevel} Risk
                    </span>
                  </div>

                  {/* Syllabus Stats */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--c-text-secondary)" }}>
                    <span>Recommended Revision:</span>
                    <span style={{ fontWeight: 600, color: "var(--c-text-primary)" }}>{recommendedHours} hours</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--c-text-secondary)" }}>
                    <span>Chapters Remaining:</span>
                    <span style={{ fontWeight: 600, color: "var(--c-text-primary)" }}>{remainingChapters} chapters</span>
                  </div>
                </div>

                {/* Chapter Toggles */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--c-surface-0)", padding: "10px 14px", borderRadius: "var(--r-md)", border: "1px solid var(--c-border-1)" }}>
                  <span style={{ fontSize: "12px", color: "var(--c-text-secondary)", fontWeight: 600 }}>Chapters completed:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button 
                      onClick={() => toggleChapterCompleted(exam.id, Math.max(0, exam.completedChapters - 1))}
                      style={{ width: "24px", height: "24px", borderRadius: "6px", background: "var(--c-surface-2)", border: "1px solid var(--c-border-2)", color: "var(--c-text-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}
                    >-</button>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--c-text-primary)", minWidth: "32px", textAlign: "center" }}>
                      {exam.completedChapters}/{exam.chapters}
                    </span>
                    <button 
                      onClick={() => toggleChapterCompleted(exam.id, Math.min(exam.chapters, exam.completedChapters + 1))}
                      style={{ width: "24px", height: "24px", borderRadius: "6px", background: "var(--c-surface-2)", border: "1px solid var(--c-border-2)", color: "var(--c-text-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}
                    >+</button>
                  </div>
                </div>

                {/* Forecast box */}
                <div style={{ background: riskBg, borderLeft: `3px solid ${riskColor}`, padding: "10px 12px", borderRadius: "0 var(--r-md) var(--r-md) 0" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: riskColor }}>Mentor Study Target Advice</p>
                  <p style={{ fontSize: "11.5px", color: "var(--c-text-secondary)", marginTop: "2px", lineHeight: 1.4 }}>
                    {daysRemaining < remainingChapters 
                      ? `Syllabus gap is critical. Devote at least ${recommendedHours} hours to revision. Recommend activating AI milestones.` 
                      : `You have ${daysRemaining} days to study ${remainingChapters} chapters. Maintain consistent study hours.`
                    }
                  </p>
                </div>

                {/* AI Plan Trigger */}
                <div style={{ display: "flex", gap: "10px", marginTop: "auto", borderTop: "1px solid var(--c-border-1)", paddingTop: "14px" }}>
                  {exam.revisionPlanGenerated ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", color: "var(--c-success)", fontSize: "12px", fontWeight: 700 }}>
                      <Check size={14} /> AI Revision schedule synced to calendar
                    </div>
                  ) : (
                    <button 
                      onClick={() => generateRevisionPlan(exam.id)}
                      className="btn btn-primary" 
                      style={{ flex: 1, fontSize: "12px", padding: "8px", background: "var(--c-accent)", color: "white", border: "1px solid var(--c-accent)" }}
                    >
                      <Sparkles size={13} style={{ marginRight: "4px" }} /> Generate AI Revision Milestones
                    </button>
                  )}
                  <button 
                    onClick={() => removeExam(exam.id)}
                    className="btn btn-icon" 
                    style={{ borderColor: "var(--c-border-1)", color: "var(--c-danger)", width: "34px", height: "34px", flexShrink: 0 }}
                    title="Remove Exam"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Exam Modal overlay */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(3,3,7,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(8px)" }}>
          <div className="card animate-up" style={{ padding: "32px", width: "420px", maxHeight: "88vh", overflowY: "auto", background: "var(--c-surface-1)", border: "1px solid var(--c-border-2)", boxShadow: "var(--sh-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--c-text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                Add New Exam Milestone
              </h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", display: "flex" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="form-label" htmlFor="exam-name-input">Exam Title</label>
                <input 
                  id="exam-name-input"
                  required
                  className="input" 
                  placeholder="e.g. Physics Midterm Exam"
                  value={newExam.name}
                  onChange={(e) => setNewExam(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="exam-subject-select">Subject Category</label>
                <select
                  id="exam-subject-select"
                  className="input"
                  value={newExam.subject}
                  onChange={(e) => setNewExam(p => ({ ...p, subject: e.target.value }))}
                >
                  {subjectsList.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label" htmlFor="exam-date-input">Exam Date</label>
                  <input
                    id="exam-date-input"
                    type="date"
                    required
                    className="input"
                    value={newExam.date}
                    onChange={(e) => setNewExam(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="exam-end-date-input">End Date (optional)</label>
                  <input
                    id="exam-end-date-input"
                    type="date"
                    className="input"
                    value={newExam.endDate}
                    min={newExam.date || undefined}
                    onChange={(e) => setNewExam(p => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label" htmlFor="exam-time-input">Exam Time</label>
                  <TimeInput
                    id="exam-time-input"
                    value={newExam.examTime}
                    onChange={(v) => setNewExam(p => ({ ...p, examTime: v }))}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="exam-duration-input">Duration (minutes)</label>
                  <input
                    id="exam-duration-input"
                    type="number"
                    min={15}
                    step={15}
                    className="input"
                    value={newExam.durationMinutes}
                    onChange={(e) => setNewExam(p => ({ ...p, durationMinutes: parseInt(e.target.value) || 180 }))}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="exam-venue-input">Venue / Location (optional)</label>
                <input
                  id="exam-venue-input"
                  className="input"
                  placeholder="e.g. Exam Hall B, Room 204"
                  value={newExam.venue}
                  onChange={(e) => setNewExam(p => ({ ...p, venue: e.target.value }))}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label" htmlFor="exam-type-select">Exam Type</label>
                  <select
                    id="exam-type-select"
                    className="input"
                    value={newExam.examType}
                    onChange={(e) => setNewExam(p => ({ ...p, examType: e.target.value as any }))}
                  >
                    <option value="Internal Assessment">Internal Assessment</option>
                    <option value="Final Exam">Final Exam</option>
                    <option value="Mid-term">Mid-term</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Practical">Practical</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" htmlFor="exam-marks-input">Total Marks (optional)</label>
                  <input
                    id="exam-marks-input"
                    type="number"
                    min={1}
                    className="input"
                    placeholder="e.g. 100"
                    value={newExam.totalMarks}
                    onChange={(e) => setNewExam(p => ({ ...p, totalMarks: e.target.value === "" ? "" : parseInt(e.target.value) || "" }))}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label" htmlFor="exam-chapters-input">Syllabus Chapters</label>
                  <input
                    id="exam-chapters-input"
                    type="number"
                    required
                    min={1}
                    className="input"
                    value={newExam.chapters}
                    onChange={(e) => setNewExam(p => ({ ...p, chapters: parseInt(e.target.value) || 8 }))}
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="exam-priority-select">Priority Level</label>
                  <select
                    id="exam-priority-select"
                    className="input"
                    value={newExam.priority}
                    onChange={(e) => setNewExam(p => ({ ...p, priority: e.target.value as any }))}
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: "12px" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: "12px" }}
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Exam Schedule Modal overlay */}
      {showUploadModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(3,3,7,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(8px)" }}>
          <div className="card animate-up" style={{ padding: "32px", width: "480px", maxHeight: "88vh", overflowY: "auto", background: "var(--c-surface-1)", border: "1px solid var(--c-border-2)", boxShadow: "var(--sh-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--c-text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                {parsedEntries ? "Review Parsed Exams" : "Upload Exam Schedule"}
              </h3>
              <button
                onClick={() => { setShowUploadModal(false); resetUploadState(); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", display: "flex" }}
              >
                <X size={20} />
              </button>
            </div>

            {!parsedEntries ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", lineHeight: 1.5 }}>
                  Upload a photo/screenshot of your exam timetable, or paste it as text — Chronova will read it and stage the exams below for you to confirm.
                </p>

                {/* Mode tabs */}
                <div style={{ display: "flex", gap: "6px", padding: "3px", background: "var(--c-surface-2)", borderRadius: "var(--r-md)", border: "1px solid var(--c-border-1)" }}>
                  {(["image", "text"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setUploadMode(mode)}
                      style={{
                        flex: 1, padding: "7px", borderRadius: "6px", border: "none", cursor: "pointer",
                        fontSize: "12.5px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                        background: uploadMode === mode ? "var(--c-surface-1)" : "transparent",
                        color: uploadMode === mode ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                        boxShadow: uploadMode === mode ? "var(--sh-sm)" : "none",
                      }}
                    >
                      {mode === "image" ? <ImageIcon size={13} /> : <FileText size={13} />}
                      {mode === "image" ? "Upload Image" : "Paste Text"}
                    </button>
                  ))}
                </div>

                {uploadMode === "image" ? (
                  <div>
                    <label
                      htmlFor="exam-schedule-image-input"
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px",
                        padding: uploadImageDataUrl ? "0" : "28px 16px", borderRadius: "var(--r-lg)",
                        border: "1px dashed var(--c-border-2)", background: "var(--c-surface-0)", cursor: "pointer", overflow: "hidden"
                      }}
                    >
                      {uploadImageDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={uploadImageDataUrl} alt="Selected exam timetable" style={{ maxWidth: "100%", maxHeight: "220px", objectFit: "contain", borderRadius: "var(--r-md)" }} />
                      ) : (
                        <>
                          <Upload size={22} color="var(--c-text-tertiary)" />
                          <span style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", fontWeight: 600 }}>Click to choose a photo or screenshot</span>
                          <span style={{ fontSize: "11px", color: "var(--c-text-tertiary)" }}>JPG or PNG, up to 8MB</span>
                        </>
                      )}
                    </label>
                    <input
                      id="exam-schedule-image-input"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      style={{ display: "none" }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
                    />
                    {uploadImageDataUrl && (
                      <button
                        type="button"
                        onClick={() => { setUploadImageDataUrl(""); setUploadImageMime(""); }}
                        className="btn btn-secondary"
                        style={{ marginTop: "8px", fontSize: "11.5px", padding: "5px 10px" }}
                      >
                        Choose a different image
                      </button>
                    )}
                  </div>
                ) : (
                  <textarea
                    id="exam-schedule-text-input"
                    className="input"
                    rows={6}
                    placeholder={"Paste your exam schedule here, e.g.\nMathematics - 15 Oct 2026 - 10:00 AM\nPhysics - 17 Oct 2026 - 2:00 PM"}
                    value={uploadText}
                    onChange={(e) => setUploadText(e.target.value)}
                    style={{ resize: "vertical", fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
                  />
                )}

                {parseError && (
                  <div className="alert alert-error" style={{ padding: "8px 12px", fontSize: "12px" }}>
                    <span>{parseError}</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => { setShowUploadModal(false); resetUploadState(); }}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "12px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleParse}
                    disabled={parsing || (uploadMode === "image" ? !uploadImageDataUrl : !uploadText.trim())}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    {parsing ? <><Loader2 size={14} className="animate-spin" /> Reading schedule…</> : <><Sparkles size={14} /> Parse with AI</>}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setParsedEntries(null)}
                  style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: "var(--c-text-secondary)", fontSize: "11.5px", fontWeight: 600, cursor: "pointer", padding: 0, alignSelf: "flex-start" }}
                >
                  <ArrowLeft size={12} /> Back
                </button>

                {parsedEntries.length === 0 ? (
                  <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)" }}>
                    No exam entries were found. Go back and try a clearer image, or paste the schedule as text.
                  </p>
                ) : (
                  <>
                    <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)" }}>
                      Found {parsedEntries.length} exam{parsedEntries.length === 1 ? "" : "s"} — uncheck any you don't want, then confirm.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto" }}>
                      {parsedEntries.map((entry, idx) => (
                        <label
                          key={idx}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px",
                            borderRadius: "var(--r-md)", border: "1px solid var(--c-border-1)",
                            background: entry.selected ? "var(--c-surface-2)" : "transparent", cursor: "pointer"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={entry.selected}
                            onChange={() => toggleParsedEntry(idx)}
                            style={{ marginTop: "3px" }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--c-text-primary)" }} className="truncate">{entry.name}</p>
                            <p style={{ fontSize: "11px", color: "var(--c-text-secondary)", marginTop: "2px" }}>
                              {entry.subject} · {entry.date}
                              {entry.examTime ? ` · ${fmtTime(entry.examTime)}` : ""}
                              {entry.venue ? ` · ${entry.venue}` : ""}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => { setShowUploadModal(false); resetUploadState(); }}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "12px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={confirmingImport || parsedEntries.filter(e => e.selected).length === 0}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: "12px" }}
                  >
                    {confirmingImport ? "Adding…" : `Add ${parsedEntries.filter(e => e.selected).length} Exam${parsedEntries.filter(e => e.selected).length === 1 ? "" : "s"}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
