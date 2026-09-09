import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

export interface ScheduleEvent {
  id: string | number;
  title: string;
  day: number;      // 0 (Mon) to 6 (Sun)
  start: number;    // decimal hour, e.g. 7.5 for 7:30
  end: number;      // decimal hour
  done: boolean;
  colorIdx: number;
}

export interface Exam {
  id: string;
  name: string;
  date: string;
  endDate?: string;         // optional, for multi-day exams
  subject: string;
  chapters: number;
  completedChapters: number;
  priority: "Low" | "Medium" | "High";
  revisionPlanGenerated: boolean;
  examTime?: string;        // "HH:MM" 24-hour, optional
  durationMinutes?: number; // optional, defaults to 180 (3h) if not set
  venue?: string;           // optional
  examType?: "Internal Assessment" | "Final Exam" | "Mid-term" | "Quiz" | "Practical";
  totalMarks?: number;      // optional
}

export interface RevisionItem {
  id: string;
  title: string;
  subject: string;
  nextReviewDate: string;
  intervalStep: number; // 1 to 5 (Day 1, 3, 7, 14, 30)
  retentionScore: number; // 0 to 100
}

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  mood: string;
}

export interface ScheduleChange {
  id: string;
  time: string;
  changeType: string;
  reason: string;
}

export interface OSNotification {
  id: string;
  time: string;
  text: string;
  actionText?: string;
  actionType?: string;
  read: boolean;
}

export interface SleepEntry {
  date: string;
  hours: number;
  quality: number; // 0-100
}

interface ScheduleState {
  events: ScheduleEvent[];
  xp: number;
  level: number;
  streak: number;
  exams: Exam[];
  revisions: RevisionItem[];
  moodHistory: MoodEntry[];
  currentMood: string;
  scheduleChanges: ScheduleChange[];
  notifications: OSNotification[];
  burnoutMode: boolean;
  sleepHistory: SleepEntry[];
  userName: string;
  isLoading: boolean;
  theme: "light"; // App is light mode only — no dark mode.
  accentColor: "purple" | "blue" | "green" | "orange";
  studentType: string;
  preferredStudyStyle: string;
  schoolName: string;
  // Snapshot of completed study hours per week, keyed by the ISO date (YYYY-MM-DD)
  // of that week's Monday. Recorded progressively as the app is used — never
  // backfilled or estimated — so week-over-week comparisons only ever reflect
  // real logged activity.
  weeklyHoursLog: Record<string, number>;

  loadFromDatabase: () => Promise<void>;
  setEvents: (events: ScheduleEvent[]) => Promise<void>;
  addEvent: (event: Omit<ScheduleEvent, "id">) => Promise<void>;
  removeEvent: (id: string | number) => Promise<void>;
  toggleEventDone: (id: string | number) => Promise<void>;
  updateEvent: (id: string | number, updated: Partial<ScheduleEvent>) => Promise<void>;

  addXP: (amount: number, reason?: string) => Promise<void>;
  setCurrentMood: (mood: string) => Promise<void>;
  setBurnoutMode: (enabled: boolean) => Promise<void>;
  addExam: (exam: Omit<Exam, "id" | "revisionPlanGenerated">) => Promise<void>;
  removeExam: (id: string) => Promise<void>;
  toggleChapterCompleted: (examId: string, completed: number) => Promise<void>;
  generateRevisionPlan: (examId: string) => Promise<void>;
  addRevisionQueue: (title: string, subject: string) => Promise<void>;
  completeRevisionItem: (id: string) => Promise<void>;
  markEventMissed: (id: string | number) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  logScheduleChange: (changeType: string, reason: string) => Promise<void>;
  addNotification: (text: string, actionType?: string, actionText?: string) => Promise<void>;
  setPreferences: (prefs: Partial<{
    theme: "light";
    accentColor: "purple" | "blue" | "green" | "orange";
    studentType: string;
    preferredStudyStyle: string;
    schoolName: string;
  }>) => Promise<void>;
  recordWeeklyHours: (weekKey: string, hours: number) => Promise<void>;
}

// Helper to convert day index + decimal hours to local Date timestamps
function getTimestampFromDayAndHour(dayIdx: number, decimalHour: number): Date {
  const d = new Date();
  const currentDay = d.getDay(); // 0 is Sunday, 1-6 are Mon-Sat
  const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  d.setDate(d.getDate() + daysToMonday + dayIdx); // Move to target day of the current week
  
  const hour = Math.floor(decimalHour);
  const min = Math.round((decimalHour % 1) * 60);
  d.setHours(hour, min, 0, 0);
  return d;
}

// Helper to parse day index and decimal hour from local Date string
function parseDayAndHourFromDate(dateStr: string) {
  const d = new Date(dateStr);
  const jsDay = d.getDay();
  const day = jsDay === 0 ? 6 : jsDay - 1; // 0 = Mon, ..., 6 = Sun
  const start = d.getHours() + d.getMinutes() / 60;
  return { day, start };
}

function getRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export const useScheduleStore = create<ScheduleState>((set, get) => {
  const supabase = createClient();

  async function saveStatsRow(updates: Partial<{
    xp: number;
    level: number;
    streak: number;
    moodHistory: MoodEntry[];
    sleepHistory: SleepEntry[];
    scheduleChanges: ScheduleChange[];
    burnoutMode: boolean;
    theme: "light";
    accentColor: "purple" | "blue" | "green" | "orange";
    studentType: string;
    preferredStudyStyle: string;
    schoolName: string;
    weeklyHoursLog: Record<string, number>;
  }>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentStats = {
      xp: get().xp,
      level: get().level,
      streak: get().streak,
      moodHistory: get().moodHistory,
      sleepHistory: get().sleepHistory,
      scheduleChanges: get().scheduleChanges,
      burnoutMode: get().burnoutMode,
      theme: get().theme,
      accentColor: get().accentColor,
      studentType: get().studentType,
      preferredStudyStyle: get().preferredStudyStyle,
      schoolName: get().schoolName,
      weeklyHoursLog: get().weeklyHoursLog,
      ...updates
    };

    // Upsert the configuration record in schedules table
    const { data: existing } = await supabase
      .from("schedules")
      .select("id")
      .eq("user_id", user.id)
      .eq("session_type", "profile_stats")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("schedules")
        .update({
          description: JSON.stringify(currentStats),
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("schedules")
        .insert({
          user_id: user.id,
          title: "Profile Config Stats",
          description: JSON.stringify(currentStats),
          session_type: "profile_stats",
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          completion_status: "done"
        });
    }
  }

  return {
    events: [],
    xp: 0,
    level: 1,
    streak: 0,
    exams: [],
    revisions: [],
    moodHistory: [],
    currentMood: "Normal",
    scheduleChanges: [],
    notifications: [],
    burnoutMode: false,
    sleepHistory: [],
    userName: "",
    isLoading: true,
    theme: "light",
    accentColor: "purple",
    studentType: "college",
    preferredStudyStyle: "balanced",
    schoolName: "",
    weeklyHoursLog: {},

    loadFromDatabase: async () => {
      set({ isLoading: true });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          set({ isLoading: false });
          return;
        }

        // 1. Load User Profile details
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        const name = profile?.name || user.email?.split("@")[0] || "Student";

        // 2. Load all schedules (events, exams, revisions, config)
        const { data: dbSchedules } = await supabase
          .from("schedules")
          .select("*")
          .eq("user_id", user.id);

        let events: ScheduleEvent[] = [];
        let exams: Exam[] = [];
        let revisions: RevisionItem[] = [];
        let xp = 0;
        let level = 1;
        let streak = 0;
        let moodHistory: MoodEntry[] = [];
        let sleepHistory: SleepEntry[] = [];
        let scheduleChanges: ScheduleChange[] = [];
        let burnoutMode = false;
        const theme: "light" = "light"; // App is light mode only — ignore any stale "dark" value from old data.
        let accentColor: "purple" | "blue" | "green" | "orange" = "purple";
        let studentType = "college";
        let preferredStudyStyle = "balanced";
        let schoolName = "";
        let weeklyHoursLog: Record<string, number> = {};

        if (dbSchedules) {
          dbSchedules.forEach((row) => {
            if (row.session_type === "profile_stats") {
              try {
                const stats = JSON.parse(row.description || "{}");
                xp = stats.xp ?? 0;
                level = stats.level ?? 1;
                streak = stats.streak ?? 0;
                moodHistory = stats.moodHistory ?? [];
                sleepHistory = stats.sleepHistory ?? [];
                scheduleChanges = stats.scheduleChanges ?? [];
                burnoutMode = stats.burnoutMode ?? false;
                // theme is intentionally not read from stored stats — app is light mode only.
                accentColor = stats.accentColor ?? "purple";
                studentType = stats.studentType ?? "college";
                preferredStudyStyle = stats.preferredStudyStyle ?? "balanced";
                schoolName = stats.schoolName ?? "";
                weeklyHoursLog = stats.weeklyHoursLog ?? {};
              } catch (e) {
                console.error("Error parsing stats config", e);
              }
            } else if (row.session_type === "exam") {
              try {
                const meta = JSON.parse(row.description || "{}");
                exams.push({
                  id: row.id,
                  name: row.title,
                  date: new Date(row.start_time).toISOString().split("T")[0],
                  endDate: meta.endDate || undefined,
                  subject: meta.subject || "",
                  chapters: meta.chapters ?? 1,
                  completedChapters: meta.completedChapters ?? 0,
                  priority: meta.priority || "Medium",
                  revisionPlanGenerated: meta.revisionPlanGenerated ?? false,
                  examTime: meta.examTime || undefined,
                  durationMinutes: meta.durationMinutes ?? undefined,
                  venue: meta.venue || undefined,
                  examType: meta.examType || undefined,
                  totalMarks: meta.totalMarks ?? undefined
                });
              } catch (e) {
                console.error("Error parsing exam meta", e);
              }
            } else if (row.session_type === "revision") {
              try {
                const meta = JSON.parse(row.description || "{}");
                revisions.push({
                  id: row.id,
                  title: row.title,
                  subject: meta.subject || "",
                  nextReviewDate: new Date(row.start_time).toISOString().split("T")[0],
                  intervalStep: meta.intervalStep ?? 1,
                  retentionScore: meta.retentionScore ?? 80
                });
              } catch (e) {
                console.error("Error parsing revision meta", e);
              }
            } else if (
              ["study", "class", "break", "gym", "sleep", "hobby"].includes(row.session_type)
            ) {
              const startInfo = parseDayAndHourFromDate(row.start_time);
              const endInfo = parseDayAndHourFromDate(row.end_time);
              
              // Guess color index
              let colorIdx = 0;
              if (row.session_type === "class") colorIdx = 2;
              else if (row.session_type === "break") colorIdx = 3;
              else if (row.session_type === "gym") colorIdx = 4;
              
              events.push({
                id: row.id,
                title: row.title,
                day: startInfo.day,
                start: startInfo.start,
                end: endInfo.start,
                done: row.completion_status === "done",
                colorIdx: row.color ? parseInt(row.color) || 0 : colorIdx
              });
            }
          });
        }

        // 3. Load notifications
        const { data: dbNotifs } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        const notifications: OSNotification[] = (dbNotifs || []).map((n) => ({
          id: n.id,
          time: getRelativeTime(n.created_at),
          text: `${n.title}: ${n.body}`,
          read: n.is_read
        }));

        set({
          userName: name,
          events,
          exams,
          revisions,
          xp,
          level,
          streak,
          moodHistory,
          sleepHistory,
          scheduleChanges,
          burnoutMode,
          notifications,
          theme,
          accentColor,
          studentType,
          preferredStudyStyle,
          schoolName,
          weeklyHoursLog,
          isLoading: false
        });
      } catch (err) {
        console.error("Error loading store from Supabase:", err);
        set({ isLoading: false });
      }
    },

    setEvents: async (events) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Update state first
      set({ events });

      // Save events to schedules table.
      // For simplicity, we delete non-exam/non-revision events and re-insert
      const nonCustomTypes = ["study", "class", "break", "gym", "sleep", "hobby"];
      
      await supabase
        .from("schedules")
        .delete()
        .eq("user_id", user.id)
        .in("session_type", nonCustomTypes);

      if (events.length > 0) {
        await supabase
          .from("schedules")
          .insert(
            events.map((e) => {
              const startT = getTimestampFromDayAndHour(e.day, e.start);
              const endT = getTimestampFromDayAndHour(e.day, e.end);
              
              let type = "study";
              const titleL = e.title.toLowerCase();
              if (titleL.includes("college") || titleL.includes("class") || titleL.includes("school")) {
                type = "class";
              } else if (titleL.includes("break") || titleL.includes("relax")) {
                type = "break";
              } else if (titleL.includes("gym") || titleL.includes("workout")) {
                type = "gym";
              }

              return {
                user_id: user.id,
                title: e.title,
                session_type: type,
                start_time: startT.toISOString(),
                end_time: endT.toISOString(),
                completion_status: e.done ? "done" : "pending",
                color: String(e.colorIdx)
              };
            })
          );
      }
    },

    addEvent: async (event) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startT = getTimestampFromDayAndHour(event.day, event.start);
      const endT = getTimestampFromDayAndHour(event.day, event.end);

      let type = "study";
      const titleL = event.title.toLowerCase();
      if (titleL.includes("college") || titleL.includes("class") || titleL.includes("school")) {
        type = "class";
      } else if (titleL.includes("break") || titleL.includes("relax")) {
        type = "break";
      } else if (titleL.includes("gym") || titleL.includes("workout")) {
        type = "gym";
      }

      const { data: inserted } = await supabase
        .from("schedules")
        .insert({
          user_id: user.id,
          title: event.title,
          session_type: type,
          start_time: startT.toISOString(),
          end_time: endT.toISOString(),
          completion_status: event.done ? "done" : "pending",
          color: String(event.colorIdx)
        })
        .select()
        .single();

      if (inserted) {
        const newEv: ScheduleEvent = {
          id: inserted.id,
          title: inserted.title,
          day: event.day,
          start: event.start,
          end: event.end,
          done: event.done,
          colorIdx: event.colorIdx
        };
        set((state) => ({ events: [...state.events, newEv] }));
      }
    },

    removeEvent: async (id) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (typeof id === "string") {
        await supabase.from("schedules").delete().eq("id", id).eq("user_id", user.id);
      }
      set((state) => ({ events: state.events.filter((e) => e.id !== id) }));
    },

    toggleEventDone: async (id) => {
      const state = get();
      const event = state.events.find((e) => e.id === id);
      if (!event) return;

      const newDone = !event.done;
      let xpGain = 0;
      let xpReason = "";

      if (newDone) {
        xpGain += 50;
        xpReason = `Completed focus session: ${event.title}`;
      }

      // Update state local events list
      const updatedEvents = state.events.map((e) => e.id === id ? { ...e, done: newDone } : e);
      set({ events: updatedEvents });

      // Save to database
      if (typeof id === "string") {
        await supabase
          .from("schedules")
          .update({ completion_status: newDone ? "done" : "pending" })
          .eq("id", id);
      }

      if (xpGain > 0) {
        await state.addXP(xpGain, xpReason);
      }
    },

    updateEvent: async (id, updated) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      set((state) => ({
        events: state.events.map((e) => e.id === id ? { ...e, ...updated } : e)
      }));

      if (typeof id === "string") {
        const dbUpdates: any = {};
        if (updated.title !== undefined) dbUpdates.title = updated.title;
        if (updated.done !== undefined) dbUpdates.completion_status = updated.done ? "done" : "pending";
        if (updated.colorIdx !== undefined) dbUpdates.color = String(updated.colorIdx);

        // If day or start/end changed, recompute timestamps
        const curr = get().events.find(e => e.id === id);
        if (curr && (updated.day !== undefined || updated.start !== undefined || updated.end !== undefined)) {
          const d = updated.day !== undefined ? updated.day : curr.day;
          const s = updated.start !== undefined ? updated.start : curr.start;
          const e = updated.end !== undefined ? updated.end : curr.end;
          dbUpdates.start_time = getTimestampFromDayAndHour(d, s).toISOString();
          dbUpdates.end_time = getTimestampFromDayAndHour(d, e).toISOString();
        }

        await supabase.from("schedules").update(dbUpdates).eq("id", id).eq("user_id", user.id);
      }
    },

    addXP: async (amount, reason) => {
      const state = get();
      let newXp = state.xp + amount;
      let newLevel = state.level;
      const xpNeeded = newLevel * 500;

      if (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        newLevel += 1;
      }

      set({ xp: newXp, level: newLevel });
      await saveStatsRow({ xp: newXp, level: newLevel });

      if (reason) {
        await state.addNotification(`+${amount} XP: ${reason}`);
      }
    },

    setCurrentMood: async (mood) => {
      const state = get();
      const todayStr = new Date().toISOString().split("T")[0];
      const filteredHistory = state.moodHistory.filter(h => h.date !== todayStr);
      const newHistory = [...filteredHistory, { date: todayStr, mood }];

      let adaptiveText = "";
      let alertMsg = "";
      let burnoutMode = state.burnoutMode;
      let updatedEvents = [...state.events];

      if (mood === "Burned Out") {
        burnoutMode = true;
        alertMsg = "Critical stress levels detected. Recovery Mode activated.";
        adaptiveText = "Burned Out logged. Shortened tomorrow's study schedules and created rest windows.";
      } else if (mood === "Tired") {
        adaptiveText = "Tired mood logged. Shortened study blocks slightly to allow more cognitive recovery.";
      } else if (mood === "Stressed") {
        adaptiveText = "Stressed mood reported. Trimmed heaviest session tomorrow to lower load.";
      } else if (mood === "Focused") {
        adaptiveText = "High focus logged. Priority study slots adjusted.";
      }

      set({
        currentMood: mood,
        moodHistory: newHistory,
        burnoutMode,
        events: updatedEvents
      });

      await saveStatsRow({
        moodHistory: newHistory,
        burnoutMode
      });

      if (adaptiveText) {
        await state.logScheduleChange(mood === "Burned Out" ? "Recovery Block" : "Rescheduled", adaptiveText);
      }
      if (alertMsg) {
        await state.addNotification(alertMsg);
      }
    },

    setBurnoutMode: async (enabled) => {
      set({ burnoutMode: enabled });
      await saveStatsRow({ burnoutMode: enabled });
      await get().addNotification(
        enabled ? "Recovery Mode enabled. Study loads scaled down." : "Recovery Mode disabled. Normal study scheduling restored."
      );
    },

    addExam: async (exam) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dateStr = exam.date;
      const timeStr = exam.examTime || "09:00";
      const durationMinutes = exam.durationMinutes ?? 180;
      const examDate = new Date(`${dateStr}T${timeStr}:00`);

      const { data: inserted } = await supabase
        .from("schedules")
        .insert({
          user_id: user.id,
          title: exam.name,
          session_type: "exam",
          start_time: examDate.toISOString(),
          end_time: new Date(examDate.getTime() + durationMinutes * 60000).toISOString(),
          completion_status: "pending",
          description: JSON.stringify({
            subject: exam.subject,
            chapters: exam.chapters,
            completedChapters: exam.completedChapters,
            priority: exam.priority,
            revisionPlanGenerated: false,
            endDate: exam.endDate || undefined,
            examTime: exam.examTime || undefined,
            durationMinutes: exam.durationMinutes ?? undefined,
            venue: exam.venue || undefined,
            examType: exam.examType || undefined,
            totalMarks: exam.totalMarks ?? undefined
          })
        })
        .select()
        .single();

      if (inserted) {
        const newExam: Exam = {
          id: inserted.id,
          name: exam.name,
          date: dateStr,
          endDate: exam.endDate,
          subject: exam.subject,
          chapters: exam.chapters,
          completedChapters: exam.completedChapters,
          priority: exam.priority,
          revisionPlanGenerated: false,
          examTime: exam.examTime,
          durationMinutes: exam.durationMinutes,
          venue: exam.venue,
          examType: exam.examType,
          totalMarks: exam.totalMarks
        };
        set((state) => ({ exams: [...state.exams, newExam] }));
      }
    },

    removeExam: async (id) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("schedules").delete().eq("id", id).eq("user_id", user.id);
      set((state) => ({ exams: state.exams.filter((e) => e.id !== id) }));
    },

    toggleChapterCompleted: async (examId, completed) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const exam = get().exams.find(e => e.id === examId);
      if (!exam) return;

      const updatedExams = get().exams.map(e => e.id === examId ? { ...e, completedChapters: completed } : e);
      set({ exams: updatedExams });

      await supabase
        .from("schedules")
        .update({
          description: JSON.stringify({
            subject: exam.subject,
            chapters: exam.chapters,
            completedChapters: completed,
            priority: exam.priority,
            revisionPlanGenerated: exam.revisionPlanGenerated
          })
        })
        .eq("id", examId);
    },

    generateRevisionPlan: async (examId) => {
      const state = get();
      const exam = state.exams.find(e => e.id === examId);
      if (!exam) return;

      // Local states update
      const updatedExams = state.exams.map(e => e.id === examId ? { ...e, revisionPlanGenerated: true } : e);
      set({ exams: updatedExams });

      // Save updated exam info
      await supabase
        .from("schedules")
        .update({
          description: JSON.stringify({
            subject: exam.subject,
            chapters: exam.chapters,
            completedChapters: exam.completedChapters,
            priority: exam.priority,
            revisionPlanGenerated: true
          })
        })
        .eq("id", examId);

      // Schedule revision milestones for tomorrow, day after, etc.
      const daysOffset = [1, 3, 5];
      const colors = [4, 5, 0];

      for (let idx = 0; idx < daysOffset.length; idx++) {
        const offset = daysOffset[idx];
        const targetDayIdx = (new Date().getDay() - 1 + offset) % 7;
        await state.addEvent({
          title: `Revision: ${exam.name}`,
          day: targetDayIdx,
          start: 16.5,
          end: 18.0,
          done: false,
          colorIdx: colors[idx]
        });
      }

      await state.logScheduleChange("Priority Shift", `Exam Revision Plan generated for ${exam.name}. study slots scheduled.`);
      await state.addNotification(`Revision plan generated for ${exam.name}. 3 revision slots added.`);
    },

    addRevisionQueue: async (title, subject) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const nextD = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const { data: inserted } = await supabase
        .from("schedules")
        .insert({
          user_id: user.id,
          title: title,
          session_type: "revision",
          start_time: new Date(nextD + "T09:00:00").toISOString(),
          end_time: new Date(nextD + "T10:00:00").toISOString(),
          completion_status: "pending",
          description: JSON.stringify({
            subject,
            intervalStep: 1,
            retentionScore: 80
          })
        })
        .select()
        .single();

      if (inserted) {
        set((state) => ({
          revisions: [...state.revisions, {
            id: inserted.id,
            title,
            subject,
            nextReviewDate: nextD,
            intervalStep: 1,
            retentionScore: 80
          }]
        }));
      }
    },

    completeRevisionItem: async (id) => {
      const state = get();
      const item = state.revisions.find(r => r.id === id);
      if (!item) return;

      const intervals = [1, 3, 7, 14, 30];
      const currentStep = item.intervalStep;
      const nextStep = Math.min(currentStep + 1, intervals.length);
      const nextIntervalDays = intervals[nextStep - 1];
      const nextReview = new Date(Date.now() + nextIntervalDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const updatedRevisions = state.revisions.map(r => r.id === id ? {
        ...r,
        intervalStep: nextStep,
        nextReviewDate: nextReview,
        retentionScore: Math.min(r.retentionScore + 8, 100)
      } : r);

      set({ revisions: updatedRevisions });

      await supabase
        .from("schedules")
        .update({
          start_time: new Date(nextReview + "T09:00:00").toISOString(),
          description: JSON.stringify({
            subject: item.subject,
            intervalStep: nextStep,
            retentionScore: Math.min(item.retentionScore + 8, 100)
          })
        })
        .eq("id", id);

      await state.addXP(50, `Completed Spaced Repetition for ${item.title}`);
    },

    markEventMissed: async (id) => {
      const state = get();
      const event = state.events.find(e => e.id === id);
      if (!event) return;

      // Delete from Supabase & update local
      await state.removeEvent(id);

      const nextDayIdx = (event.day + 1) % 7;
      let resStart = 16.0;
      let resEnd = 17.5;

      const conflict = state.events.some(e => e.day === nextDayIdx && e.start < 17.5 && e.end > 16.0);
      if (conflict) {
        resStart = 18.0;
        resEnd = 19.5;
      }

      await state.addEvent({
        title: `${event.title} (Rescheduled)`,
        day: nextDayIdx,
        start: resStart,
        end: resEnd,
        done: false,
        colorIdx: event.colorIdx
      });

      const startStr = resStart >= 12 ? `${resStart === 12 ? 12 : resStart - 12}:00 PM` : `${resStart}:00 AM`;
      await state.logScheduleChange("Redistributed", `Missed session "${event.title}". Automatically moved to tomorrow at ${startStr}.`);
      await state.addNotification(`You missed ${event.title}. Rescheduled it for tomorrow at ${startStr}.`);
    },

    markNotificationRead: async (id) => {
      const state = get();
      set({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      });
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },

    deleteNotification: async (id) => {
      const state = get();
      set({
        notifications: state.notifications.filter(n => n.id !== id)
      });
      await supabase.from("notifications").delete().eq("id", id);
    },

    clearAllNotifications: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      set({ notifications: [] });
      await supabase.from("notifications").delete().eq("user_id", user.id);
    },

    logScheduleChange: async (changeType, reason) => {
      const state = get();
      const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const newChange: ScheduleChange = {
        id: `change-${Date.now()}`,
        time: timeStr,
        changeType,
        reason
      };

      const updatedChanges = [newChange, ...state.scheduleChanges];
      set({ scheduleChanges: updatedChanges });
      await saveStatsRow({ scheduleChanges: updatedChanges });
    },

    addNotification: async (text, actionType, actionText) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Extract title and body
      const splitIdx = text.indexOf(":");
      const title = splitIdx !== -1 ? text.substring(0, splitIdx).trim() : "Chronova AI";
      const body = splitIdx !== -1 ? text.substring(splitIdx + 1).trim() : text;

      const { data: inserted } = await supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          title,
          body,
          type: actionType || "alert",
          is_read: false
        })
        .select()
        .single();

      if (inserted) {
        const state = get();
        const newNotif: OSNotification = {
          id: inserted.id,
          time: "Just now",
          text: `${title}: ${body}`,
          read: false,
          actionType,
          actionText
        };
        set({ notifications: [newNotif, ...state.notifications] });
      }
    },

    setPreferences: async (prefs) => {
      set(prefs as any);
      if (prefs.theme) {
        localStorage.setItem("chronova_theme", prefs.theme);
      }
      if (prefs.accentColor) {
        localStorage.setItem("chronova_accent", prefs.accentColor);
      }
      await saveStatsRow(prefs);
    },

    // Records this week's completed-study-hours total under its week key (the
    // ISO date of that week's Monday), so future weeks can show a real
    // week-over-week comparison. Safe to call repeatedly during the same week
    // — it just overwrites that week's entry with the latest true total.
    recordWeeklyHours: async (weekKey, hours) => {
      const current = get().weeklyHoursLog;
      if (current[weekKey] === hours) return; // no change, skip a write
      const updated = { ...current, [weekKey]: hours };
      set({ weeklyHoursLog: updated });
      await saveStatsRow({ weeklyHoursLog: updated });
    }
  };
});
