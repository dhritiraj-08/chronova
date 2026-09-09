"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useScheduleStore } from "@/lib/store/scheduleStore";
import { Save, Bell, Shield, User, Sun, Palette, GraduationCap, Clock } from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();
  const {
    accentColor: storeAccent,
    studentType: storeStudentType,
    preferredStudyStyle: storeStudyStyle,
    schoolName: storeSchool,
    setPreferences,
    loadFromDatabase 
  } = useScheduleStore();

  const [profile, setProfile] = useState<any>({ name: "", sleep_start: "23:00", sleep_end: "07:00" });
  const [accentColor, setAccentColor] = useState<"purple" | "blue" | "green" | "orange">("purple");
  const [studentType, setStudentType] = useState<string>("college");
  const [preferredStudyStyle, setPreferredStudyStyle] = useState<string>("balanced");
  const [schoolName, setSchoolName] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load store preferences
    loadFromDatabase().then(() => {
      setAccentColor(useScheduleStore.getState().accentColor || "purple");
      setStudentType(useScheduleStore.getState().studentType || "college");
      setPreferredStudyStyle(useScheduleStore.getState().preferredStudyStyle || "balanced");
      setSchoolName(useScheduleStore.getState().schoolName || "");
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setProfile(data);
            }
          });
      }
    });
  }, [supabase, loadFromDatabase]);

  // Handle instant accent change in the UI
  const handleAccentChange = (newAccent: "purple" | "blue" | "green" | "orange") => {
    setAccentColor(newAccent);
    setPreferences({ accentColor: newAccent });
  };

  async function saveSettings() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Update the Supabase user profile details
      await supabase.from("profiles")
        .update({ 
          name: profile.name, 
          sleep_start: profile.sleep_start, 
          sleep_end: profile.sleep_end 
        })
        .eq("id", user.id);

      // 2. Save academic preferences in store (syncs config row in database)
      await setPreferences({
        theme: "light",
        accentColor,
        studentType,
        preferredStudyStyle,
        schoolName
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const studentTypes = [
    { id: "school", label: "School Student" },
    { id: "college", label: "University / College" },
    { id: "competitive", label: "Competitive Exam Prep" },
    { id: "professional", label: "Working Professional" }
  ];

  const studyStyles = [
    { id: "morning", label: "Morning (Early Bird)" },
    { id: "night", label: "Night (Night Owl)" },
    { id: "balanced", label: "Balanced Routine" }
  ];

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", paddingBottom: "40px" }} className="animate-fade">
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 600, letterSpacing: "-0.015em", color: "var(--c-text-primary)" }}>
          Preferences & Settings
        </h1>
        <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", marginTop: "2px" }}>
          Personalize your layout aesthetics, focus rhythm, and academic profiles.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "28px" }}>
        
        {/* Visual Customizer Card */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "var(--r-md)", background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Palette size={14} color="var(--c-accent)" />
            </div>
            <h2 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>Visual Theme</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Interface Mode — light mode only, no toggle */}
            <div>
              <label className="form-label" style={{ marginBottom: "8px" }}>Interface Mode</label>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "var(--r-lg)",
                  background: "var(--c-surface-1)",
                  border: "2px solid var(--c-accent)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  justifyContent: "center"
                }}
              >
                <Sun size={16} color="var(--c-accent)" />
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--c-text-primary)" }}>
                  Warm Ivory Light
                </span>
              </div>
            </div>

            {/* Accent Color Pickers */}
            <div>
              <label className="form-label" style={{ marginBottom: "8px" }}>Accent Accentuation</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                
                {/* Purple */}
                <button
                  onClick={() => handleAccentChange("purple")}
                  title="Academic Purple"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#8B5CF6",
                    border: accentColor === "purple" ? "3px solid var(--c-text-primary)" : "1px solid transparent",
                    cursor: "pointer",
                    transform: accentColor === "purple" ? "scale(1.1)" : "scale(1)",
                    transition: "transform 150ms ease"
                  }}
                />

                {/* Blue */}
                <button
                  onClick={() => handleAccentChange("blue")}
                  title="Muted Steel Blue"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#3B82F6",
                    border: accentColor === "blue" ? "3px solid var(--c-text-primary)" : "1px solid transparent",
                    cursor: "pointer",
                    transform: accentColor === "blue" ? "scale(1.1)" : "scale(1)",
                    transition: "transform 150ms ease"
                  }}
                />

                {/* Green */}
                <button
                  onClick={() => handleAccentChange("green")}
                  title="Sage Green"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#10B981",
                    border: accentColor === "green" ? "3px solid var(--c-text-primary)" : "1px solid transparent",
                    cursor: "pointer",
                    transform: accentColor === "green" ? "scale(1.1)" : "scale(1)",
                    transition: "transform 150ms ease"
                  }}
                />

                {/* Orange */}
                <button
                  onClick={() => handleAccentChange("orange")}
                  title="Clay Orange"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#F97316",
                    border: accentColor === "orange" ? "3px solid var(--c-text-primary)" : "1px solid transparent",
                    cursor: "pointer",
                    transform: accentColor === "orange" ? "scale(1.1)" : "scale(1)",
                    transition: "transform 150ms ease"
                  }}
                />

              </div>
            </div>

          </div>
        </div>

        {/* Profile Card */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "var(--r-md)", background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={14} color="var(--c-text-secondary)" />
            </div>
            <h2 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>Academic Profile</h2>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label className="form-label" htmlFor="settings-name">Full Name</label>
              <input 
                id="settings-name" 
                className="input" 
                value={profile?.name || ""} 
                onChange={e => setProfile((p: any) => ({ ...p, name: e.target.value }))} 
                placeholder="Enter your name" 
              />
            </div>

            {/* Student Type Selector */}
            <div>
              <label className="form-label" style={{ marginBottom: "6px" }}>Student Classification</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {studentTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setStudentType(type.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--r-full)",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                      background: studentType === type.id ? "var(--c-accent-dark)" : "var(--c-surface-2)",
                      color: studentType === type.id ? "#FFFFFF" : "var(--c-text-secondary)",
                      border: "none",
                      transition: "background-color 150ms ease, color 150ms ease"
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* School / Institution field */}
            <div>
              <label className="form-label" htmlFor="settings-school">Academic Institution</label>
              <input 
                id="settings-school" 
                className="input" 
                value={schoolName} 
                onChange={e => setSchoolName(e.target.value)} 
                placeholder="e.g. Stanford University" 
              />
            </div>

            {/* Study Style selector */}
            <div>
              <label className="form-label" style={{ marginBottom: "6px" }}>Preferred Study Focus Window</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {studyStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setPreferredStudyStyle(style.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--r-full)",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                      background: preferredStudyStyle === style.id ? "var(--c-accent-dark)" : "var(--c-surface-2)",
                      color: preferredStudyStyle === style.id ? "#FFFFFF" : "var(--c-text-secondary)",
                      border: "none",
                      transition: "background-color 150ms ease, color 150ms ease"
                    }}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Sleep Schedule Card */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "var(--r-md)", background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={14} color="var(--c-text-secondary)" />
            </div>
            <h2 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>Daily Sleep Baseline</h2>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label className="form-label" htmlFor="settings-sleep-start">Bedtime</label>
              <input id="settings-sleep-start" type="time" className="input" value={profile?.sleep_start || "23:00"} onChange={e => setProfile((p: any) => ({ ...p, sleep_start: e.target.value }))} />
            </div>
            <span style={{ color: "var(--c-text-tertiary)", marginTop: "18px", fontSize: "12.5px" }}>to</span>
            <div style={{ flex: 1 }}>
              <label className="form-label" htmlFor="settings-sleep-end">Wake Up</label>
              <input id="settings-sleep-end" type="time" className="input" value={profile?.sleep_end || "07:00"} onChange={e => setProfile((p: any) => ({ ...p, sleep_end: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "var(--r-md)", background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={14} color="var(--c-text-secondary)" />
            </div>
            <h2 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>Notifications</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {["Study reminders", "Break reminders", "Daily summary", "Motivational tips"].map(n => (
              <label key={n} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "var(--c-accent)", width: "15px", height: "15px" }} />
                <span style={{ fontSize: "13px", color: "var(--c-text-secondary)" }}>{n}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Privacy & Security Card */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "var(--r-md)", background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={14} color="var(--c-text-secondary)" />
            </div>
            <h2 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--c-text-primary)" }}>Privacy & Security</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontSize: "12.5px", color: "var(--c-text-secondary)", lineHeight: 1.5 }}>
              Your data is encrypted locally and synchronized with secure endpoints. We do not track personal analytics.
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
              <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "6px 12px" }}>Change Password</button>
              <button style={{ padding: "6px 12px", borderRadius: "var(--r-md)", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", color: "#B91C1C", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}>Delete Account</button>
            </div>
          </div>
        </div>
      </div>

      <button 
        id="save-settings-btn" 
        onClick={saveSettings} 
        disabled={saving}
        className="btn btn-primary" 
        style={{ width: "100%", padding: "10px", justifyContent: "center", fontSize: "13px", fontWeight: 500 }}
      >
        <Save size={14} style={{ marginRight: "4px" }} /> {saving ? "Saving Changes..." : saved ? "Changes Saved!" : "Save Changes"}
      </button>
    </div>
  );
}
