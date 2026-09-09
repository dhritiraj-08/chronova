"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Check, X, Copy, AlertTriangle, Mail, Pencil, Users as UsersIcon } from "lucide-react";
import { useInstitutionStore, TeacherRecord } from "@/lib/store/institutionStore";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const emptyForm = { name: "", email: "", subjects: "", maxHoursPerWeek: 20, days: [] as string[], from: "08:00", until: "16:00" };

const emptyEditForm = { name: "", subjects: "", maxHoursPerWeek: 20, days: [] as string[], from: "08:00", until: "16:00" };

function toEditForm(t: TeacherRecord) {
  return { name: t.name, subjects: t.subjects.join(", "), maxHoursPerWeek: t.maxHoursPerWeek, days: t.availableDays, from: t.availableFrom, until: t.availableUntil };
}

export default function TeachersPage() {
  const { teachers, isLoading, loadError, loadAdminData, inviteTeacher, updateTeacher, removeTeacher } = useInstitutionStore();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => { loadAdminData(); }, [loadAdminData]);

  function toggleDay(day: string) {
    setForm(prev => ({ ...prev, days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day] }));
  }

  function toggleEditDay(day: string) {
    setEditForm(prev => ({ ...prev, days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day] }));
  }

  function startEdit(t: TeacherRecord) {
    setEditingId(t.id);
    setEditForm(toEditForm(t));
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    await updateTeacher(id, {
      name: editForm.name,
      subjects: editForm.subjects.split(",").map(s => s.trim()).filter(Boolean),
      maxHoursPerWeek: editForm.maxHoursPerWeek,
      availableDays: editForm.days,
      availableFrom: editForm.from,
      availableUntil: editForm.until
    });
    setSavingEdit(false);
    setEditingId(null);
  }

  async function handleAdd() {
    if (!form.name || !form.email) return;
    setSubmitting(true);
    setError("");
    const result = await inviteTeacher({
      name: form.name,
      email: form.email,
      subjects: form.subjects.split(",").map(s => s.trim()).filter(Boolean),
      maxHoursPerWeek: form.maxHoursPerWeek,
      availableDays: form.days,
      availableFrom: form.from,
      availableUntil: form.until
    });
    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setCreatedCreds({ email: form.email, password: result.tempPassword });
    setForm(emptyForm);
    setShowAdd(false);
  }

  function copyCreds() {
    if (!createdCreds) return;
    navigator.clipboard.writeText(`Email: ${createdCreds.email}\nTemporary password: ${createdCreds.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", color: "var(--c-text-secondary)" }}>
        <div style={{ fontSize: "13px", fontWeight: 500 }}>Loading teachers...</div>
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
    <div style={{ maxWidth: "1000px", margin: "0 auto" }} className="animate-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <p className="eyebrow">Administration</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, marginTop: "4px", color: "var(--c-text-primary)" }}>Teacher Management</h1>
        </div>
        <button id="add-teacher-btn" onClick={() => { setShowAdd(!showAdd); setError(""); }} className="btn btn-primary">
          <Plus size={16} /> Add Teacher
        </button>
      </div>

      {/* Just-created credentials banner */}
      {createdCreds && (
        <div className="card" style={{ padding: "18px 20px", marginBottom: "20px", background: "var(--c-success-dim)", border: "1px solid var(--c-success-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#047857", display: "flex", alignItems: "center", gap: "6px" }}>
                <Check size={14} /> Teacher account created — share these credentials
              </p>
              <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "6px" }}>
                <strong style={{ color: "var(--c-text-primary)" }}>Email:</strong> {createdCreds.email}
              </p>
              <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "2px" }}>
                <strong style={{ color: "var(--c-text-primary)" }}>Temporary password:</strong> <code style={{ background: "var(--c-surface-2)", padding: "2px 6px", borderRadius: "4px" }}>{createdCreds.password}</code>
              </p>
              <p style={{ fontSize: "11.5px", color: "var(--c-text-tertiary)", marginTop: "8px" }}>
                This password is shown only once. Share it with the teacher directly — they can change it after logging in.
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <button onClick={copyCreds} className="btn btn-secondary" style={{ fontSize: "12px", padding: "6px 10px" }}>
                <Copy size={13} /> {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={() => setCreatedCreds(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)" }}>
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px", color: "var(--c-text-primary)" }}>Add New Teacher</h3>
          {error && (
            <div className="alert alert-error" style={{ padding: "8px 12px", fontSize: "12px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label className="form-label">Full Name</label>
              <input className="input" placeholder="e.g. Mr. Raj Patel" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input type="email" className="input" placeholder="teacher@school.edu" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label className="form-label">Subjects (comma-separated)</label>
              <input className="input" placeholder="e.g. Physics, Maths" value={form.subjects} onChange={e => setForm({ ...form, subjects: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Max Hours / Week</label>
              <input type="number" min={1} className="input" value={form.maxHoursPerWeek} onChange={e => setForm({ ...form, maxHoursPerWeek: parseInt(e.target.value) || 20 })} />
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label className="form-label" style={{ marginBottom: "8px" }}>Available Days</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {DAYS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)} style={{
                  padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", border: "none",
                  background: form.days.includes(d) ? "var(--c-orange-dim)" : "var(--c-surface-2)",
                  color: form.days.includes(d) ? "#B45309" : "var(--c-text-secondary)"
                }}>{d.slice(0, 3)}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label className="form-label">Available From</label>
              <input type="time" className="input" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Until</label>
              <input type="time" className="input" value={form.until} onChange={e => setForm({ ...form, until: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setShowAdd(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={submitting || !form.name || !form.email} className="btn btn-primary">
              {submitting ? "Creating account..." : "Create Teacher Account"}
            </button>
          </div>
        </div>
      )}

      {teachers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--c-surface-1)", border: "1px dashed var(--c-border-2)", borderRadius: "16px" }}>
          <UsersIcon size={26} color="var(--c-text-tertiary)" style={{ margin: "0 auto 12px auto" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-text-primary)" }}>No teachers yet</p>
          <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "4px" }}>Add your first teacher to start building timetables.</p>
          <button onClick={() => setShowAdd(true)} className="btn btn-secondary" style={{ marginTop: "16px", fontSize: "12.5px" }}>
            <Plus size={13} /> Add Teacher
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {teachers.map(t => (
            editingId === t.id ? (
              <div key={t.id} className="card" style={{ padding: "20px", border: "1px solid var(--c-accent-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>Edit {t.name}</h3>
                  <button onClick={() => setEditingId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)" }}><X size={16} /></button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
                  <div>
                    <label className="form-label">Full Name</label>
                    <input className="input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Subjects (comma-separated)</label>
                    <input className="input" value={editForm.subjects} onChange={e => setEditForm({ ...editForm, subjects: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ marginBottom: "8px" }}>Available Days</label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {DAYS.map(d => (
                      <button key={d} type="button" onClick={() => toggleEditDay(d)} style={{
                        padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", border: "none",
                        background: editForm.days.includes(d) ? "var(--c-orange-dim)" : "var(--c-surface-2)",
                        color: editForm.days.includes(d) ? "#B45309" : "var(--c-text-secondary)"
                      }}>{d.slice(0, 3)}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "16px", marginBottom: "18px", flexWrap: "wrap" }}>
                  <div>
                    <label className="form-label">Available From</label>
                    <input type="time" className="input" value={editForm.from} onChange={e => setEditForm({ ...editForm, from: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Until</label>
                    <input type="time" className="input" value={editForm.until} onChange={e => setEditForm({ ...editForm, until: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Max Hours / Week</label>
                    <input type="number" min={1} className="input" style={{ width: "100px" }} value={editForm.maxHoursPerWeek} onChange={e => setEditForm({ ...editForm, maxHoursPerWeek: parseInt(e.target.value) || 20 })} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => setEditingId(null)} className="btn btn-secondary">Cancel</button>
                  <button onClick={() => handleSaveEdit(t.id)} disabled={savingEdit || !editForm.name} className="btn btn-primary">
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div key={t.id} className="card card-hover" style={{ padding: "18px 20px", display: "flex", gap: "16px", alignItems: "center" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #f9731633, #3b82f633)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: "#c2410c" }}>{t.name.trim().split(" ").slice(-1)[0]?.[0]?.toUpperCase() || "T"}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: "15px", color: "var(--c-text-primary)" }}>{t.name}</p>
                  <p style={{ fontSize: "12px", color: "var(--c-text-tertiary)", marginTop: "1px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Mail size={11} /> {t.email}
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--c-text-secondary)", marginTop: "5px" }}>{t.subjects.join(" · ") || "No subjects set"}</p>
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                    {t.availableDays.map(d => <span key={d} className="badge badge-accent" style={{ fontSize: "11px", padding: "2px 8px" }}>{d.slice(0, 3)}</span>)}
                    <span style={{ fontSize: "12px", color: "var(--c-text-tertiary)", alignSelf: "center" }}>{t.availableFrom} – {t.availableUntil} · max {t.maxHoursPerWeek}h/wk</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                  <button onClick={() => startEdit(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", padding: "8px", borderRadius: "8px", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--c-surface-2)"; e.currentTarget.style.color = "var(--c-text-primary)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--c-text-tertiary)"; }}
                    title="Edit teacher"
                  >
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => removeTeacher(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-danger)", padding: "8px", borderRadius: "8px", transition: "all 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--c-danger-dim)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    title="Remove teacher"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
