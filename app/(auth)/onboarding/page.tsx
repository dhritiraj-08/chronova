"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Moon, ChevronRight, ChevronLeft, Plus, X, Check, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SUBJECT_COLORS } from "@/lib/utils";

const STEPS = ["Profile", "Subjects", "Schedule", "Goals"];

const EDUCATION_LEVELS = [
  "High School (9-10)", "Higher Secondary (11-12)",
  "Undergraduate", "Postgraduate", "Competitive Exam Prep", "Other"
];

const SAMPLE_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English",
  "History", "Geography", "Computer Science", "Economics", "Psychology"
];

const GOAL_OPTIONS = [
  "Score 90%+ in exams", "Get into top college", "Clear competitive exams",
  "Improve focus", "Better time management", "Reduce stress", "Build study habits"
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !user.user_metadata?.role) {
        supabase.auth.updateUser({
          data: { role: "student" }
        });
      }
    });
  }, [supabase]);
  const [loading, setLoading] = useState(false);

  const [educationLevel, setEducationLevel] = useState("");
  const [age, setAge] = useState("");
  const [subjects, setSubjects] = useState<{ name: string; difficulty: number; color: string }[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);
  const [sleepStart, setSleepStart] = useState("23:00");
  const [sleepEnd, setSleepEnd] = useState("07:00");
  const [collegeStart, setCollegeStart] = useState("09:00");
  const [collegeEnd, setCollegeEnd] = useState("15:00");
  const [goals, setGoals] = useState<string[]>([]);

  function addSubject(name: string) {
    if (!name.trim() || subjects.find((s) => s.name === name)) return;
    const color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];
    setSubjects((prev) => [...prev, { name, difficulty: 3, color }]);
    setNewSubject("");
  }

  function removeSubject(name: string) {
    setSubjects((prev) => prev.filter((s) => s.name !== name));
  }

  function toggleGoal(goal: string) {
    setGoals((prev) => prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]);
  }

  function toggleWeak(subj: string) {
    setWeakSubjects((prev) => prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]);
  }

  async function handleFinish() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    await supabase.from("profiles").update({
      education_level: educationLevel,
      age: parseInt(age) || null,
      goals, sleep_start: sleepStart, sleep_end: sleepEnd, onboarded: true,
    }).eq("id", user.id);

    if (subjects.length > 0) {
      await supabase.from("subjects").insert(
        subjects.map((s) => ({
          user_id: user.id, subject_name: s.name,
          difficulty_level: s.difficulty, color: s.color,
          priority: weakSubjects.includes(s.name) ? 3 : 2,
        }))
      );
    }
    router.push("/dashboard");
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }} className="page-bg animate-fade">
      <div className="page-content" style={{ width: "100%", maxWidth: "480px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <Logo size={24} />
        </div>

        {/* Onboarding Container */}
        <div className="card" style={{ padding: "28px" }}>

          {/* Step indicator header */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 600, color: "var(--c-text-primary)" }}>
                {STEPS[step]} Setup
              </h1>
              <span style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)", fontWeight: 600 }}>
                STEP {step + 1} OF {STEPS.length}
              </span>
            </div>
            {/* Progress bar */}
            <div className="progress-track" style={{ height: "3px" }}>
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Stepper nodes */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{
                flex: 1, height: "3px", borderRadius: "999px",
                background: i <= step ? "var(--c-accent)" : "rgba(255,255,255,0.03)",
                transition: "all var(--t-base)"
              }} />
            ))}
          </div>

          {/* ── Step 0: Profile ── */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label className="form-label">Education Level</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {EDUCATION_LEVELS.map((level) => {
                    const selected = educationLevel === level;
                    return (
                      <button key={level} onClick={() => setEducationLevel(level)} style={{
                        padding: "6px 12px", borderRadius: "var(--r-md)", fontSize: "12.5px", cursor: "pointer",
                        transition: "all var(--t-fast)",
                        background: selected ? "var(--c-surface-3)" : "var(--c-surface-2)",
                        border: "1px solid " + (selected ? "var(--c-text-secondary)" : "var(--c-border-1)"),
                        color: selected ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                        fontWeight: selected ? 500 : 400
                      }}>{level}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="form-label" htmlFor="onboard-age">Age</label>
                <input id="onboard-age" type="number" placeholder="e.g. 18"
                  value={age} onChange={(e) => setAge(e.target.value)}
                  className="input" style={{ maxWidth: "120px" }} min={10} max={40} />
              </div>
            </div>
          )}

          {/* ── Step 1: Subjects ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="form-label" style={{ marginBottom: "8px" }}>Quick-add subjects</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                  {SAMPLE_SUBJECTS.map((s) => {
                    const added = !!subjects.find((sub) => sub.name === s);
                    return (
                      <button key={s} onClick={() => addSubject(s)} disabled={added} style={{
                        padding: "5px 10px", borderRadius: "var(--r-md)", fontSize: "12px",
                        cursor: added ? "default" : "pointer",
                        background: added ? "var(--c-surface-3)" : "var(--c-surface-2)",
                        border: "1px solid " + (added ? "var(--c-text-secondary)" : "var(--c-border-1)"),
                        color: added ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                        transition: "all var(--t-fast)",
                        fontWeight: added ? 500 : 400
                      }}>
                        {added ? <Check size={10} style={{ display: "inline", marginRight: "3px" }} /> : <Plus size={10} style={{ display: "inline", marginRight: "3px" }} />}
                        {s}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input id="onboard-subject-input" type="text" placeholder="Add custom subject…"
                    value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSubject(newSubject)}
                    className="input" />
                  <button onClick={() => addSubject(newSubject)} className="btn btn-primary" style={{ padding: "8px 12px" }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {subjects.length > 0 && (
                <div style={{ borderTop: "1px solid var(--c-border-1)", paddingTop: "12px" }}>
                  <label className="form-label" style={{ marginBottom: "8px" }}>Your subjects — tap to mark as weak (needs focus)</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {subjects.map((s) => {
                      const isWeak = weakSubjects.includes(s.name);
                      return (
                        <div key={s.name} style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          padding: "4px 10px", borderRadius: "var(--r-md)",
                          background: isWeak ? "rgba(239, 68, 68, 0.04)" : "var(--c-surface-2)",
                          border: `1px solid ${isWeak ? "rgba(239, 68, 68, 0.15)" : "var(--c-border-1)"}`,
                          transition: "all var(--t-fast)"
                        }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: isWeak ? "var(--c-danger)" : s.color }} />
                          <button onClick={() => toggleWeak(s.name)} style={{ background: "none", border: "none", color: "var(--c-text-primary)", cursor: "pointer", fontSize: "12.5px", fontWeight: 500 }}>
                            {s.name}
                          </button>
                          <button onClick={() => removeSubject(s.name)} style={{ background: "none", border: "none", color: "var(--c-text-tertiary)", cursor: "pointer", display: "flex" }}>
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--c-text-tertiary)", marginTop: "8px" }}>Red dots represent weak subjects. Chronova will prioritize studying them.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Schedule ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ padding: "14px 16px", background: "var(--c-surface-1)", borderRadius: "var(--r-lg)", border: "1px solid var(--c-border-1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Moon size={14} color="var(--c-text-secondary)" />
                  <label className="form-label" style={{ margin: 0 }}>Sleep Schedule</label>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)", fontWeight: 500, marginBottom: "4px" }}>Bedtime</p>
                    <input type="time" value={sleepStart} onChange={(e) => setSleepStart(e.target.value)} className="input" />
                  </div>
                  <span style={{ color: "var(--c-text-tertiary)", fontSize: "12.5px", marginTop: "14px" }}>→</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)", fontWeight: 500, marginBottom: "4px" }}>Wake Up</p>
                    <input type="time" value={sleepEnd} onChange={(e) => setSleepEnd(e.target.value)} className="input" />
                  </div>
                </div>
              </div>

              <div style={{ padding: "14px 16px", background: "var(--c-surface-1)", borderRadius: "var(--r-lg)", border: "1px solid var(--c-border-1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <BookOpen size={14} color="var(--c-text-secondary)" />
                  <label className="form-label" style={{ margin: 0 }}>College / School Hours</label>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)", fontWeight: 500, marginBottom: "4px" }}>Start</p>
                    <input type="time" value={collegeStart} onChange={(e) => setCollegeStart(e.target.value)} className="input" />
                  </div>
                  <span style={{ color: "var(--c-text-tertiary)", fontSize: "12.5px", marginTop: "14px" }}>→</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "10.5px", color: "var(--c-text-tertiary)", fontWeight: 500, marginBottom: "4px" }}>End</p>
                    <input type="time" value={collegeEnd} onChange={(e) => setCollegeEnd(e.target.value)} className="input" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Goals ── */}
          {step === 3 && (
            <div>
              <label className="form-label" style={{ marginBottom: "10px", display: "block" }}>Select academic goals</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {GOAL_OPTIONS.map((goal) => {
                  const selected = goals.includes(goal);
                  return (
                    <button 
                      key={goal} 
                      onClick={() => toggleGoal(goal)} 
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "10px 14px", borderRadius: "var(--r-md)", textAlign: "left",
                        cursor: "pointer", transition: "all var(--t-fast)",
                        background: selected ? "var(--c-surface-2)" : "transparent",
                        border: selected ? "1px solid var(--c-border-2)" : "1px solid var(--c-border-1)",
                        color: "var(--c-text-primary)",
                      }}
                    >
                      <div style={{
                        width: "16px", height: "16px", borderRadius: "var(--r-sm)", flexShrink: 0,
                        background: selected ? "var(--c-accent)" : "transparent",
                        border: selected ? "1px solid transparent" : "1px solid var(--c-border-2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {selected && <Check size={10} color="white" />}
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>{goal}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation controls */}
          <div style={{ display: "flex", gap: "8px", marginTop: "24px" }}>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="btn btn-secondary" style={{ flex: 1, padding: "10px" }}>
                <ChevronLeft size={14} /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="btn btn-primary" style={{ flex: 1, padding: "10px" }}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={handleFinish} disabled={loading} className="btn btn-primary" style={{ flex: 1, padding: "10px" }}>
                {loading ? "Setting up…" : "Finish Setup"}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--c-text-tertiary)", marginTop: "16px" }}>
          Your data is synchronized privately.
        </p>
      </div>
    </div>
  );
}
