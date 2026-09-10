"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Users, DoorOpen, X, AlertTriangle, Pencil } from "lucide-react";
import { useInstitutionStore, BatchRecord, ClassroomRecord } from "@/lib/store/institutionStore";

// `TYPE_COLORS` is for icons/badge backgrounds only — those bright tones fail
// 4.5:1 as small text, so the type label below uses `TYPE_TEXT_COLORS`
// (a separately darkened, contrast-verified set) instead.
const TYPE_COLORS: Record<string, string> = { classroom: "#3b82f6", lab: "#10b981", auditorium: "#f59e0b" };
const TYPE_TEXT_COLORS: Record<string, string> = { classroom: "#1D4ED8", lab: "#047857", auditorium: "#92400E" };

const emptyBatchForm = { name: "", studentCount: "" as number | "", ageGroup: "" };
const emptyRoomForm = { name: "", capacity: "" as number | "", type: "classroom" };

function toBatchEditForm(b: BatchRecord) {
  return { name: b.name, studentCount: b.studentCount as number | "", ageGroup: b.ageGroup };
}
function toRoomEditForm(c: ClassroomRecord) {
  return { name: c.name, capacity: c.capacity as number | "", type: c.type };
}

export default function ClassesPage() {
  const { batches, classrooms, isLoading, loadError, loadAdminData, addBatch, updateBatch, removeBatch, addClassroom, updateClassroom, removeClassroom } = useInstitutionStore();
  const [tab, setTab] = useState<"batches" | "classrooms">("batches");
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [batchForm, setBatchForm] = useState(emptyBatchForm);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);

  // Inline-edit state — same pattern as /admin/teachers: the card in the
  // list transforms into an edit form in place rather than a separate
  // overlay, so editing looks and behaves the same way everywhere in admin.
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [batchEditForm, setBatchEditForm] = useState(emptyBatchForm);
  const [savingBatchEdit, setSavingBatchEdit] = useState(false);

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomEditForm, setRoomEditForm] = useState(emptyRoomForm);
  const [savingRoomEdit, setSavingRoomEdit] = useState(false);

  useEffect(() => { loadAdminData(); }, [loadAdminData]);

  async function handleAddBatch() {
    if (!batchForm.name) return;
    await addBatch({ name: batchForm.name, studentCount: Number(batchForm.studentCount) || 0, ageGroup: batchForm.ageGroup });
    setBatchForm(emptyBatchForm);
    setShowAddBatch(false);
  }

  async function handleAddRoom() {
    if (!roomForm.name) return;
    await addClassroom({ name: roomForm.name, capacity: Number(roomForm.capacity) || 0, type: roomForm.type });
    setRoomForm(emptyRoomForm);
    setShowAddRoom(false);
  }

  function startEditBatch(b: BatchRecord) {
    setEditingBatchId(b.id);
    setBatchEditForm(toBatchEditForm(b));
  }

  async function handleSaveBatchEdit(id: string) {
    if (!batchEditForm.name) return;
    setSavingBatchEdit(true);
    await updateBatch(id, {
      name: batchEditForm.name,
      studentCount: Number(batchEditForm.studentCount) || 0,
      ageGroup: batchEditForm.ageGroup
    });
    setSavingBatchEdit(false);
    setEditingBatchId(null);
  }

  function startEditRoom(c: ClassroomRecord) {
    setEditingRoomId(c.id);
    setRoomEditForm(toRoomEditForm(c));
  }

  async function handleSaveRoomEdit(id: string) {
    if (!roomEditForm.name) return;
    setSavingRoomEdit(true);
    await updateClassroom(id, {
      name: roomEditForm.name,
      capacity: Number(roomEditForm.capacity) || 0,
      type: roomEditForm.type
    });
    setSavingRoomEdit(false);
    setEditingRoomId(null);
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", color: "var(--c-text-secondary)" }}>
        <div style={{ fontSize: "13px", fontWeight: 500 }}>Loading classes...</div>
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
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, marginTop: "4px", color: "var(--c-text-primary)" }}>Classes & Classrooms</h1>
        </div>
        {tab === "batches" ? (
          <button onClick={() => setShowAddBatch(true)} className="btn btn-primary"><Plus size={16} /> Add Batch</button>
        ) : (
          <button onClick={() => setShowAddRoom(true)} className="btn btn-primary"><Plus size={16} /> Add Classroom</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "var(--c-surface-2)", borderRadius: "12px", padding: "4px", marginBottom: "24px", gap: "4px", width: "fit-content" }}>
        {(["batches", "classrooms"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
            fontSize: "14px", fontWeight: 600, transition: "all 0.2s",
            background: tab === t ? "var(--c-surface-1)" : "transparent",
            color: tab === t ? "var(--c-accent-dark)" : "var(--c-text-tertiary)",
            boxShadow: tab === t ? "var(--sh-sm)" : "none"
          }}>
            {t === "batches" ? <><Users size={14} style={{ display: "inline", marginRight: "6px" }} />Batches/Classes</> : <><DoorOpen size={14} style={{ display: "inline", marginRight: "6px" }} />Classrooms</>}
          </button>
        ))}
      </div>

      {tab === "batches" && showAddBatch && (
        <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--c-text-primary)" }}>New Batch</h3>
            <button onClick={() => setShowAddBatch(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)" }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label className="form-label">Batch Name</label>
              <input className="input" placeholder="e.g. Class 11 - Science A" value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Students</label>
              <input type="number" min={0} className="input" value={batchForm.studentCount} onChange={e => setBatchForm({ ...batchForm, studentCount: e.target.value === "" ? "" : parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="form-label">Age Group</label>
              <input className="input" placeholder="e.g. 16-17" value={batchForm.ageGroup} onChange={e => setBatchForm({ ...batchForm, ageGroup: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setShowAddBatch(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleAddBatch} disabled={!batchForm.name} className="btn btn-primary">Add Batch</button>
          </div>
        </div>
      )}

      {tab === "classrooms" && showAddRoom && (
        <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--c-text-primary)" }}>New Classroom</h3>
            <button onClick={() => setShowAddRoom(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)" }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label className="form-label">Room Name</label>
              <input className="input" placeholder="e.g. Room 101" value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Capacity</label>
              <input type="number" min={0} className="input" value={roomForm.capacity} onChange={e => setRoomForm({ ...roomForm, capacity: e.target.value === "" ? "" : parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="form-label">Type</label>
              <select className="input" value={roomForm.type} onChange={e => setRoomForm({ ...roomForm, type: e.target.value })}>
                <option value="classroom">Classroom</option>
                <option value="lab">Lab</option>
                <option value="auditorium">Auditorium</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setShowAddRoom(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleAddRoom} disabled={!roomForm.name} className="btn btn-primary">Add Classroom</button>
          </div>
        </div>
      )}

      {tab === "batches" && (
        batches.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--c-surface-1)", border: "1px dashed var(--c-border-2)", borderRadius: "16px" }}>
            <Users size={26} color="var(--c-text-tertiary)" style={{ margin: "0 auto 12px auto" }} />
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-text-primary)" }}>No batches yet</p>
            <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "4px" }}>Add a batch to start assigning teachers and generating timetables.</p>
            <button onClick={() => setShowAddBatch(true)} className="btn btn-secondary" style={{ marginTop: "16px", fontSize: "12.5px" }}>
              <Plus size={13} /> Add Batch
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {batches.map((b) => (
              editingBatchId === b.id ? (
                <div key={b.id} className="card" style={{ padding: "20px", border: "1px solid var(--c-accent-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>Edit {b.name}</h3>
                    <button onClick={() => setEditingBatchId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)" }}><X size={16} /></button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                    <div>
                      <label className="form-label">Batch Name</label>
                      <input className="input" value={batchEditForm.name} onChange={e => setBatchEditForm({ ...batchEditForm, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Students</label>
                      <input type="number" min={0} className="input" value={batchEditForm.studentCount} onChange={e => setBatchEditForm({ ...batchEditForm, studentCount: e.target.value === "" ? "" : parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="form-label">Age Group</label>
                      <input className="input" placeholder="e.g. 16-17" value={batchEditForm.ageGroup} onChange={e => setBatchEditForm({ ...batchEditForm, ageGroup: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setEditingBatchId(null)} className="btn btn-secondary">Cancel</button>
                    <button onClick={() => handleSaveBatchEdit(b.id)} disabled={savingBatchEdit || !batchEditForm.name} className="btn btn-primary">
                      {savingBatchEdit ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div key={b.id} className="card card-hover" style={{ padding: "18px 20px", display: "flex", gap: "16px", alignItems: "center" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--c-secondary-dim)", border: "1px solid var(--c-secondary-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Users size={17} color="var(--c-secondary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: "15px", color: "var(--c-text-primary)" }}>{b.name}</p>
                    <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "3px" }}>
                      {b.studentCount} students{b.ageGroup ? ` · Age ${b.ageGroup}` : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                    <button onClick={() => startEditBatch(b)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", padding: "8px", borderRadius: "8px", transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--c-surface-2)"; e.currentTarget.style.color = "var(--c-text-primary)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--c-text-tertiary)"; }}
                      title="Edit batch"
                    >
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => removeBatch(b.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-danger)", padding: "8px", borderRadius: "8px", transition: "all 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--c-danger-dim)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      title="Remove batch"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        )
      )}

      {tab === "classrooms" && (
        classrooms.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--c-surface-1)", border: "1px dashed var(--c-border-2)", borderRadius: "16px" }}>
            <DoorOpen size={26} color="var(--c-text-tertiary)" style={{ margin: "0 auto 12px auto" }} />
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-text-primary)" }}>No classrooms yet</p>
            <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "4px" }}>Add classrooms so the timetable generator can assign rooms.</p>
            <button onClick={() => setShowAddRoom(true)} className="btn btn-secondary" style={{ marginTop: "16px", fontSize: "12.5px" }}>
              <Plus size={13} /> Add Classroom
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
            {classrooms.map((c) => (
              editingRoomId === c.id ? (
                <div key={c.id} className="card" style={{ padding: "18px", border: "1px solid var(--c-accent-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>Edit {c.name}</h3>
                    <button onClick={() => setEditingRoomId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)" }}><X size={15} /></button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                    <div>
                      <label className="form-label">Room Name</label>
                      <input className="input" value={roomEditForm.name} onChange={e => setRoomEditForm({ ...roomEditForm, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Capacity</label>
                      <input type="number" min={0} className="input" value={roomEditForm.capacity} onChange={e => setRoomEditForm({ ...roomEditForm, capacity: e.target.value === "" ? "" : parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="form-label">Type</label>
                      <select className="input" value={roomEditForm.type} onChange={e => setRoomEditForm({ ...roomEditForm, type: e.target.value })}>
                        <option value="classroom">Classroom</option>
                        <option value="lab">Lab</option>
                        <option value="auditorium">Auditorium</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => setEditingRoomId(null)} className="btn btn-secondary" style={{ flex: 1, fontSize: "12.5px" }}>Cancel</button>
                    <button onClick={() => handleSaveRoomEdit(c.id)} disabled={savingRoomEdit || !roomEditForm.name} className="btn btn-primary" style={{ flex: 1, fontSize: "12.5px" }}>
                      {savingRoomEdit ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div key={c.id} className="card card-hover" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${TYPE_COLORS[c.type] || "#6b7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                        <DoorOpen size={16} color={TYPE_COLORS[c.type] || "#6b7280"} />
                      </div>
                      <p style={{ fontWeight: 700, fontSize: "15.5px", color: "var(--c-text-primary)" }}>{c.name}</p>
                      <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "3px" }}>Capacity: {c.capacity} students</p>
                      <span style={{
                        display: "inline-block", marginTop: "10px",
                        padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 700,
                        background: `${TYPE_COLORS[c.type] || "#6b7280"}18`,
                        border: `1px solid ${TYPE_COLORS[c.type] || "#6b7280"}40`,
                        color: TYPE_TEXT_COLORS[c.type] || "var(--c-text-secondary)"
                      }}>
                        {c.type.charAt(0).toUpperCase() + c.type.slice(1)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                      <button onClick={() => startEditRoom(c)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", padding: "6px", borderRadius: "8px", transition: "all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--c-surface-2)"; e.currentTarget.style.color = "var(--c-text-primary)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--c-text-tertiary)"; }}
                        title="Edit classroom"
                      >
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => removeClassroom(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-danger)", padding: "6px", borderRadius: "8px", flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--c-danger-dim)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                        title="Remove classroom"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )
      )}
    </div>
  );
}
