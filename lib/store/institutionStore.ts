import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

// institution_notifications.read is a single shared column, which works
// for a direct (to_user_id set) notification but can't work for a
// broadcast (to_user_id null) — every recipient shares that one row, so
// persisting "read" server-side would mark it read for every other
// recipient too. Broadcast read-state is instead tracked per-viewer in
// localStorage, which is exactly the right scope: private to this
// browser, never touches the shared row, never leaks between users.
const BROADCAST_READ_KEY = "chronova_read_broadcast_notifications";

function getReadBroadcastIds(): Set<string> {
  try {
    const raw = localStorage.getItem(BROADCAST_READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markBroadcastReadLocally(id: string) {
  try {
    const ids = getReadBroadcastIds();
    ids.add(id);
    localStorage.setItem(BROADCAST_READ_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // localStorage unavailable (private browsing, etc) — read state just
    // won't persist across reloads for this viewer, which is an acceptable
    // degradation rather than a crash.
  }
}

export interface Institution {
  id: string;
  name: string;
  type: string;
}

export interface TeacherRecord {
  id: string;          // shared primary key across teacher_profiles AND teachers rows
  userId: string;
  name: string;
  email: string;
  subjects: string[];
  maxHoursPerWeek: number;
  availableDays: string[];
  availableFrom: string;   // "HH:MM"
  availableUntil: string;  // "HH:MM"
}

export interface ClassroomRecord {
  id: string;
  name: string;
  capacity: number;
  type: string; // 'classroom' | 'lab' | 'auditorium'
}

export interface BatchRecord {
  id: string;
  name: string;
  studentCount: number;
  ageGroup: string;
}

export interface TimetableEntry {
  id: string;
  batchId: string;
  batchName: string;
  teacherId: string | null;
  teacherName: string;
  classroomId: string | null;
  classroomName: string;
  subjectName: string;
  dayOfWeek: string;
  startTime: string; // "HH:MM:SS" as returned by Postgres `time`
  endTime: string;
}

export type TeacherRequestType = "reschedule" | "swap" | "leave" | "substitution";
export type TeacherRequestStatus = "pending" | "approved" | "rejected";

export interface TeacherRequestRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  type: TeacherRequestType;
  details: Record<string, any>;
  status: TeacherRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export type NotificationRoleTarget = "admin" | "teacher" | "all";

export interface InstitutionNotificationRecord {
  id: string;
  fromUserId: string | null;
  fromName: string;
  toUserId: string | null;
  roleTarget: NotificationRoleTarget;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface InstitutionState {
  institution: Institution | null;
  myRole: "admin" | "teacher" | null;
  myTeacherId: string | null; // set only when myRole === 'teacher'
  teachers: TeacherRecord[];
  classrooms: ClassroomRecord[];
  batches: BatchRecord[];
  timetable: TimetableEntry[];
  teacherRequests: TeacherRequestRecord[];
  notifications: InstitutionNotificationRecord[];
  isLoading: boolean;
  loadError: string | null;

  loadAdminData: () => Promise<void>;
  loadTeacherData: () => Promise<void>;

  inviteTeacher: (input: {
    name: string;
    email: string;
    subjects: string[];
    maxHoursPerWeek: number;
    availableDays: string[];
    availableFrom: string;
    availableUntil: string;
  }) => Promise<{ tempPassword: string } | { error: string }>;
  updateTeacher: (id: string, updates: Partial<Omit<TeacherRecord, "id" | "userId">>) => Promise<void>;
  removeTeacher: (id: string) => Promise<void>;

  addClassroom: (input: Omit<ClassroomRecord, "id">) => Promise<void>;
  removeClassroom: (id: string) => Promise<void>;

  addBatch: (input: Omit<BatchRecord, "id">) => Promise<void>;
  removeBatch: (id: string) => Promise<void>;

  addTimetableEntry: (input: {
    batchId: string;
    teacherId: string | null;
    classroomId: string | null;
    subjectName: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
  removeTimetableEntry: (id: string) => Promise<void>;
  generateTimetableForBatch: (batchId: string) => Promise<{ error?: string }>;

  approveRequest: (id: string) => Promise<void>;
  rejectRequest: (id: string) => Promise<void>;
  submitTeacherRequest: (input: { type: TeacherRequestType; details: Record<string, any> }) => Promise<void>;

  sendNotification: (input: { toUserId?: string | null; roleTarget: NotificationRoleTarget; title: string; message: string }) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
}

function timeToHHMM(t: string): string {
  return (t || "").slice(0, 5);
}

export const useInstitutionStore = create<InstitutionState>((set, get) => {
  const supabase = createClient();

  // Concurrent callers within this tab (e.g. React Strict Mode double-invoking
  // a mount effect, or two admin pages' effects firing back to back) must
  // never each provision their own institution row. All callers share the
  // same in-flight resolution promise instead of racing to create duplicates.
  let inFlightResolve: Promise<Institution | null> | null = null;

  async function resolveOrCreateInstitution(): Promise<Institution | null> {
    if (inFlightResolve) return inFlightResolve;
    inFlightResolve = doResolveOrCreateInstitution().finally(() => {
      inFlightResolve = null;
    });
    return inFlightResolve;
  }

  async function doResolveOrCreateInstitution(): Promise<Institution | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Every lookup below uses order+limit(1) instead of .maybeSingle() —
    // .maybeSingle() errors (PGRST116) if more than one row matches, which
    // would incorrectly fall through to "create a new institution" instead
    // of just using one of the existing ones. order(created_at) makes the
    // choice deterministic (always the oldest) if duplicates ever exist.

    // 1. Already an institution_members admin?
    const { data: memberships } = await supabase
      .from("institution_members")
      .select("institution_id, role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .order("created_at", { ascending: true })
      .limit(1);
    const membership = memberships?.[0];

    if (membership) {
      const { data: insts } = await supabase
        .from("institutions")
        .select("id, name, type")
        .eq("id", membership.institution_id)
        .limit(1);
      if (insts?.[0]) return { id: insts[0].id, name: insts[0].name, type: insts[0].type || "school" };
    }

    // 2. Legacy: an institutions row already owned by this user (admin_id) but
    // with no institution_members row yet — backfill the membership row.
    const { data: ownedInsts } = await supabase
      .from("institutions")
      .select("id, name, type")
      .eq("admin_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    const ownedInst = ownedInsts?.[0];

    if (ownedInst) {
      await supabase.from("institution_members").insert({
        institution_id: ownedInst.id,
        user_id: user.id,
        role: "admin"
      });
      return { id: ownedInst.id, name: ownedInst.name, type: ownedInst.type || "school" };
    }

    // Guard: this user already belongs to an institution under a non-admin
    // role (e.g. a teacher who ended up on /admin — Phase 3's login-time
    // role redirect isn't wired up yet, so this can still happen by direct
    // navigation). They must never be silently auto-provisioned a brand
    // new institution just because they aren't an admin anywhere — that
    // would fork off a phantom institution no one else can see, exactly
    // the bug this guard exists to prevent.
    const { data: anyMemberships } = await supabase
      .from("institution_members")
      .select("role")
      .eq("user_id", user.id)
      .limit(1);
    if (anyMemberships && anyMemberships.length > 0) {
      throw new Error(`This account is registered as a ${anyMemberships[0].role}, not an institution admin. Visit /${anyMemberships[0].role} instead.`);
    }

    // 3. First time this admin has ever opened the portal — provision a new institution.
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();
    const defaultName = profile?.name ? `${profile.name}'s Institution` : "My Institution";

    const { data: created, error } = await supabase
      .from("institutions")
      .insert({ name: defaultName, type: "school", admin_id: user.id })
      .select("id, name, type")
      .single();

    if (error || !created) return null;

    await supabase.from("institution_members").insert({
      institution_id: created.id,
      user_id: user.id,
      role: "admin"
    });

    return { id: created.id, name: created.name, type: created.type || "school" };
  }

  async function fetchTeachers(institutionId: string): Promise<TeacherRecord[]> {
    const [{ data: profiles }, { data: rosterRows }] = await Promise.all([
      supabase.from("teacher_profiles").select("*").eq("institution_id", institutionId),
      supabase.from("teachers").select("*").eq("institution_id", institutionId)
    ]);
    const rosterById = new Map((rosterRows || []).map((r: any) => [r.id, r]));
    return (profiles || []).map((p: any) => {
      const roster = rosterById.get(p.id);
      return {
        id: p.id,
        userId: p.user_id,
        name: p.name,
        email: p.email || "",
        subjects: p.subjects || [],
        maxHoursPerWeek: p.max_hours_per_week ?? 20,
        availableDays: roster?.available_days || [],
        availableFrom: roster?.available_from ? timeToHHMM(roster.available_from) : "08:00",
        availableUntil: roster?.available_until ? timeToHHMM(roster.available_until) : "16:00"
      };
    });
  }

  async function fetchClassrooms(institutionId: string): Promise<ClassroomRecord[]> {
    const { data } = await supabase.from("classrooms").select("*").eq("institution_id", institutionId);
    return (data || []).map((c: any) => ({ id: c.id, name: c.name, capacity: c.capacity ?? 0, type: c.type || "classroom" }));
  }

  async function fetchBatches(institutionId: string): Promise<BatchRecord[]> {
    const { data } = await supabase.from("batches").select("*").eq("institution_id", institutionId);
    return (data || []).map((b: any) => ({ id: b.id, name: b.name, studentCount: b.student_count ?? 0, ageGroup: b.age_group || "" }));
  }

  async function fetchTimetable(institutionId: string, teachers: TeacherRecord[], classrooms: ClassroomRecord[], batches: BatchRecord[]): Promise<TimetableEntry[]> {
    const { data } = await supabase.from("institution_timetables").select("*").eq("institution_id", institutionId);
    const teacherById = new Map(teachers.map(t => [t.id, t]));
    const classroomById = new Map(classrooms.map(c => [c.id, c]));
    const batchById = new Map(batches.map(b => [b.id, b]));
    return (data || []).map((row: any) => ({
      id: row.id,
      batchId: row.batch_id,
      batchName: batchById.get(row.batch_id)?.name || "Unassigned Batch",
      teacherId: row.teacher_id,
      teacherName: row.teacher_id ? (teacherById.get(row.teacher_id)?.name || "Unassigned") : "Unassigned",
      classroomId: row.classroom_id,
      classroomName: row.classroom_id ? (classroomById.get(row.classroom_id)?.name || "TBD") : "TBD",
      subjectName: row.subject_name,
      dayOfWeek: row.day_of_week,
      startTime: timeToHHMM(row.start_time),
      endTime: timeToHHMM(row.end_time)
    })).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async function fetchTeacherRequests(institutionId: string, teachers: TeacherRecord[]): Promise<TeacherRequestRecord[]> {
    const { data } = await supabase
      .from("teacher_requests")
      .select("*")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    const teacherById = new Map(teachers.map(t => [t.id, t]));
    return (data || []).map((r: any) => ({
      id: r.id,
      teacherId: r.teacher_id,
      teacherName: teacherById.get(r.teacher_id)?.name || "Former Teacher",
      type: r.type,
      details: r.details || {},
      status: r.status,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at
    }));
  }

  // `teachers` is used to resolve a sender's display name without querying
  // `profiles` directly — that table's RLS only allows a user to read their
  // OWN row, so a teacher looking up who an admin's notification came from
  // (or vice versa) would always get blocked and fall back to a placeholder.
  // Every legitimate sender here is either the institution's own admin
  // (identified by process of elimination — anyone not found in the
  // already-accessible teachers list) or one of the teachers already loaded.
  async function fetchNotifications(institutionId: string, userId: string, teachers: TeacherRecord[]): Promise<InstitutionNotificationRecord[]> {
    const { data } = await supabase
      .from("institution_notifications")
      .select("*")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });

    const teacherNameByUserId = new Map(teachers.map(t => [t.userId, t.name]));
    const readBroadcastIds = getReadBroadcastIds();

    return (data || []).map((n: any) => {
      let fromName = "Chronova";
      if (n.from_user_id) {
        if (n.from_user_id === userId) fromName = "You";
        else fromName = teacherNameByUserId.get(n.from_user_id) || "Institution Admin";
      }
      const isBroadcast = n.to_user_id === null;
      return {
        id: n.id,
        fromUserId: n.from_user_id,
        fromName,
        toUserId: n.to_user_id,
        roleTarget: n.role_target || "all",
        title: n.title,
        message: n.message || "",
        read: isBroadcast ? readBroadcastIds.has(n.id) : !!n.read,
        createdAt: n.created_at
      };
    });
  }

  return {
    institution: null,
    myRole: null,
    myTeacherId: null,
    teachers: [],
    classrooms: [],
    batches: [],
    timetable: [],
    teacherRequests: [],
    notifications: [],
    isLoading: true,
    loadError: null,

    loadAdminData: async () => {
      set({ isLoading: true, loadError: null });
      try {
        const institution = await resolveOrCreateInstitution();
        if (!institution) {
          set({ isLoading: false, loadError: "Could not resolve or create your institution." });
          return;
        }
        const teachers = await fetchTeachers(institution.id);
        const classrooms = await fetchClassrooms(institution.id);
        const batches = await fetchBatches(institution.id);
        const timetable = await fetchTimetable(institution.id, teachers, classrooms, batches);
        const teacherRequests = await fetchTeacherRequests(institution.id, teachers);
        const { data: { user } } = await supabase.auth.getUser();
        const notifications = user ? await fetchNotifications(institution.id, user.id, teachers) : [];

        set({
          institution, myRole: "admin", myTeacherId: null,
          teachers, classrooms, batches, timetable, teacherRequests, notifications,
          isLoading: false
        });
      } catch (err: any) {
        console.error("Error loading institution admin data:", err);
        set({ isLoading: false, loadError: err.message || "Failed to load institution data." });
      }
    },

    loadTeacherData: async () => {
      set({ isLoading: true, loadError: null });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { set({ isLoading: false, loadError: "Not signed in." }); return; }

        const { data: myProfile } = await supabase
          .from("teacher_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!myProfile) {
          set({ isLoading: false, loadError: "No teacher profile found for this account yet." });
          return;
        }

        const { data: inst } = await supabase
          .from("institutions")
          .select("id, name, type")
          .eq("id", myProfile.institution_id)
          .maybeSingle();

        const institution: Institution | null = inst ? { id: inst.id, name: inst.name, type: inst.type || "school" } : null;
        if (!institution) { set({ isLoading: false, loadError: "Institution not found." }); return; }

        const teachers = await fetchTeachers(institution.id);
        const classrooms = await fetchClassrooms(institution.id);
        const batches = await fetchBatches(institution.id);
        const timetable = await fetchTimetable(institution.id, teachers, classrooms, batches);

        const { data: myRequests } = await supabase
          .from("teacher_requests")
          .select("*")
          .eq("teacher_id", myProfile.id)
          .order("created_at", { ascending: false });

        const teacherRequests: TeacherRequestRecord[] = (myRequests || []).map((r: any) => ({
          id: r.id,
          teacherId: r.teacher_id,
          teacherName: myProfile.name,
          type: r.type,
          details: r.details || {},
          status: r.status,
          createdAt: r.created_at,
          resolvedAt: r.resolved_at
        }));

        const notifications = await fetchNotifications(institution.id, user.id, teachers);

        set({
          institution, myRole: "teacher", myTeacherId: myProfile.id,
          teachers, classrooms, batches,
          timetable: timetable.filter(t => t.teacherId === myProfile.id),
          teacherRequests, notifications,
          isLoading: false
        });
      } catch (err: any) {
        console.error("Error loading teacher data:", err);
        set({ isLoading: false, loadError: err.message || "Failed to load teacher data." });
      }
    },

    inviteTeacher: async (input) => {
      const institution = get().institution;
      if (!institution) return { error: "No institution loaded." };

      const res = await fetch("/api/institution/invite-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId: institution.id, ...input })
      });
      const data = await res.json();
      if (!res.ok || data.error) return { error: data.error || "Failed to invite teacher." };

      await get().loadAdminData();
      return { tempPassword: data.tempPassword };
    },

    updateTeacher: async (id, updates) => {
      const profileUpdates: Record<string, any> = {};
      if (updates.name !== undefined) profileUpdates.name = updates.name;
      if (updates.email !== undefined) profileUpdates.email = updates.email;
      if (updates.subjects !== undefined) profileUpdates.subjects = updates.subjects;
      if (updates.maxHoursPerWeek !== undefined) profileUpdates.max_hours_per_week = updates.maxHoursPerWeek;

      const rosterUpdates: Record<string, any> = {};
      if (updates.name !== undefined) rosterUpdates.name = updates.name;
      if (updates.subjects !== undefined) rosterUpdates.subjects = updates.subjects;
      if (updates.availableDays !== undefined) rosterUpdates.available_days = updates.availableDays;
      if (updates.availableFrom !== undefined) rosterUpdates.available_from = updates.availableFrom;
      if (updates.availableUntil !== undefined) rosterUpdates.available_until = updates.availableUntil;

      await Promise.all([
        Object.keys(profileUpdates).length > 0
          ? supabase.from("teacher_profiles").update(profileUpdates).eq("id", id)
          : Promise.resolve(),
        Object.keys(rosterUpdates).length > 0
          ? supabase.from("teachers").update(rosterUpdates).eq("id", id)
          : Promise.resolve()
      ]);

      set((state) => ({
        teachers: state.teachers.map(t => t.id === id ? { ...t, ...updates } : t)
      }));
    },

    removeTeacher: async (id) => {
      await supabase.from("teacher_profiles").delete().eq("id", id);
      await supabase.from("teachers").delete().eq("id", id);
      set((state) => ({ teachers: state.teachers.filter(t => t.id !== id) }));
    },

    addClassroom: async (input) => {
      const institution = get().institution;
      if (!institution) return;
      const { data } = await supabase
        .from("classrooms")
        .insert({ institution_id: institution.id, name: input.name, capacity: input.capacity, type: input.type })
        .select()
        .single();
      if (data) {
        set((state) => ({ classrooms: [...state.classrooms, { id: data.id, name: data.name, capacity: data.capacity ?? 0, type: data.type }] }));
      }
    },

    removeClassroom: async (id) => {
      await supabase.from("classrooms").delete().eq("id", id);
      set((state) => ({ classrooms: state.classrooms.filter(c => c.id !== id) }));
    },

    addBatch: async (input) => {
      const institution = get().institution;
      if (!institution) return;
      const { data } = await supabase
        .from("batches")
        .insert({ institution_id: institution.id, name: input.name, student_count: input.studentCount, age_group: input.ageGroup })
        .select()
        .single();
      if (data) {
        set((state) => ({ batches: [...state.batches, { id: data.id, name: data.name, studentCount: data.student_count ?? 0, ageGroup: data.age_group || "" }] }));
      }
    },

    removeBatch: async (id) => {
      await supabase.from("batches").delete().eq("id", id);
      set((state) => ({ batches: state.batches.filter(b => b.id !== id) }));
    },

    addTimetableEntry: async (input) => {
      const institution = get().institution;
      if (!institution) return;
      const { data, error } = await supabase
        .from("institution_timetables")
        .insert({
          institution_id: institution.id,
          batch_id: input.batchId,
          teacher_id: input.teacherId,
          classroom_id: input.classroomId,
          subject_name: input.subjectName,
          day_of_week: input.dayOfWeek,
          start_time: input.startTime,
          end_time: input.endTime,
          is_ai_generated: false
        })
        .select()
        .single();
      if (error || !data) return;

      const teacher = get().teachers.find(t => t.id === input.teacherId);
      const classroom = get().classrooms.find(c => c.id === input.classroomId);
      const batch = get().batches.find(b => b.id === input.batchId);

      const newEntry: TimetableEntry = {
        id: data.id,
        batchId: input.batchId,
        batchName: batch?.name || "Unassigned Batch",
        teacherId: input.teacherId,
        teacherName: teacher?.name || "Unassigned",
        classroomId: input.classroomId,
        classroomName: classroom?.name || "TBD",
        subjectName: input.subjectName,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime
      };
      set((state) => ({ timetable: [...state.timetable, newEntry] }));

      // Notify every teacher in the institution that the timetable changed.
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("institution_notifications").insert({
        institution_id: institution.id,
        from_user_id: user?.id || null,
        to_user_id: null,
        role_target: "teacher",
        title: "Timetable updated",
        message: `${input.subjectName} was added to ${batch?.name || "a batch"}'s timetable on ${input.dayOfWeek}.`
      });
    },

    removeTimetableEntry: async (id) => {
      await supabase.from("institution_timetables").delete().eq("id", id);
      set((state) => ({ timetable: state.timetable.filter(t => t.id !== id) }));
    },

    generateTimetableForBatch: async (batchId) => {
      const { institution, teachers, classrooms, batches } = get();
      if (!institution) return { error: "No institution loaded." };
      const batch = batches.find(b => b.id === batchId);
      if (!batch) return { error: "Batch not found." };

      // Derive the subject list for this batch from its teachers' combined subjects
      // (no separate per-batch subject list exists in the schema yet).
      const subjectSet = new Set<string>();
      teachers.forEach(t => t.subjects.forEach(s => subjectSet.add(s)));
      const subjects = Array.from(subjectSet);
      if (subjects.length === 0) return { error: "Add at least one teacher with subjects before generating a timetable." };
      if (classrooms.length === 0) return { error: "Add at least one classroom before generating a timetable." };

      const res = await fetch("/api/institution/generate-timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institution: { subjects, teachers, classrooms } })
      });
      const result = await res.json();
      if (!res.ok || result.error) return { error: result.error || "Generation failed." };

      const teacherByName = new Map(teachers.map(t => [t.name, t]));
      const classroomByName = new Map(classrooms.map(c => [c.name, c]));

      // Replace this batch's existing timetable rows with the freshly generated ones.
      await supabase.from("institution_timetables").delete().eq("institution_id", institution.id).eq("batch_id", batchId);

      const rows = (result.timetable || [])
        .filter((e: any) => e.subject_name !== "Lunch Break")
        .map((e: any) => ({
          institution_id: institution.id,
          batch_id: batchId,
          teacher_id: teacherByName.get(e.teacher_name)?.id || null,
          classroom_id: classroomByName.get(e.classroom_name)?.id || null,
          subject_name: e.subject_name,
          day_of_week: e.day_of_week,
          start_time: e.start_time,
          end_time: e.end_time,
          is_ai_generated: true
        }));

      if (rows.length > 0) {
        await supabase.from("institution_timetables").insert(rows);
      }

      const timetable = await fetchTimetable(institution.id, teachers, classrooms, batches);
      set({ timetable });

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("institution_notifications").insert({
        institution_id: institution.id,
        from_user_id: user?.id || null,
        to_user_id: null,
        role_target: "teacher",
        title: "Timetable regenerated",
        message: `${batch.name}'s timetable was regenerated. Please review your updated schedule.`
      });

      return {};
    },

    approveRequest: async (id) => {
      const req = get().teacherRequests.find(r => r.id === id);
      if (!req) return;
      const resolvedAt = new Date().toISOString();
      await supabase.from("teacher_requests").update({ status: "approved", resolved_at: resolvedAt }).eq("id", id);
      set((state) => ({
        teacherRequests: state.teacherRequests.map(r => r.id === id ? { ...r, status: "approved", resolvedAt } : r)
      }));

      const institution = get().institution;
      const teacher = get().teachers.find(t => t.id === req.teacherId);
      if (institution && teacher) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("institution_notifications").insert({
          institution_id: institution.id,
          from_user_id: user?.id || null,
          to_user_id: teacher.userId,
          role_target: "teacher",
          title: "Request approved",
          message: `Your ${req.type} request has been approved.`
        });
      }
    },

    rejectRequest: async (id) => {
      const req = get().teacherRequests.find(r => r.id === id);
      if (!req) return;
      const resolvedAt = new Date().toISOString();
      await supabase.from("teacher_requests").update({ status: "rejected", resolved_at: resolvedAt }).eq("id", id);
      set((state) => ({
        teacherRequests: state.teacherRequests.map(r => r.id === id ? { ...r, status: "rejected", resolvedAt } : r)
      }));

      const institution = get().institution;
      const teacher = get().teachers.find(t => t.id === req.teacherId);
      if (institution && teacher) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("institution_notifications").insert({
          institution_id: institution.id,
          from_user_id: user?.id || null,
          to_user_id: teacher.userId,
          role_target: "teacher",
          title: "Request rejected",
          message: `Your ${req.type} request was not approved. Contact your admin for details.`
        });
      }
    },

    submitTeacherRequest: async (input) => {
      const { institution, myTeacherId } = get();
      if (!institution || !myTeacherId) return;

      const { data, error } = await supabase
        .from("teacher_requests")
        .insert({
          teacher_id: myTeacherId,
          institution_id: institution.id,
          type: input.type,
          details: input.details,
          status: "pending"
        })
        .select()
        .single();
      if (error || !data) return;

      const myName = get().teachers.find(t => t.id === myTeacherId)?.name
        || (await supabase.from("teacher_profiles").select("name").eq("id", myTeacherId).maybeSingle()).data?.name
        || "A teacher";

      set((state) => ({
        teacherRequests: [{
          id: data.id, teacherId: myTeacherId, teacherName: myName,
          type: input.type, details: input.details, status: "pending",
          createdAt: data.created_at, resolvedAt: null
        }, ...state.teacherRequests]
      }));

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("institution_notifications").insert({
        institution_id: institution.id,
        from_user_id: user?.id || null,
        to_user_id: null,
        role_target: "admin",
        title: "New teacher request",
        message: `${myName} submitted a ${input.type} request.`
      });
    },

    sendNotification: async (input) => {
      const institution = get().institution;
      if (!institution) return;
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("institution_notifications")
        .insert({
          institution_id: institution.id,
          from_user_id: user?.id || null,
          to_user_id: input.toUserId || null,
          role_target: input.roleTarget,
          title: input.title,
          message: input.message
        })
        .select()
        .single();
      if (error || !data) return;

      const { data: profile } = user ? await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle() : { data: null };

      set((state) => ({
        notifications: [{
          id: data.id, fromUserId: user?.id || null, fromName: profile?.name || "You",
          toUserId: input.toUserId || null, roleTarget: input.roleTarget,
          title: input.title, message: input.message, read: false, createdAt: data.created_at
        }, ...state.notifications]
      }));
    },

    markNotificationRead: async (id) => {
      const notification = get().notifications.find(n => n.id === id);
      const isBroadcast = notification ? notification.toUserId === null : false;

      if (isBroadcast) {
        // Shared row, one recipient reading it must never affect anyone
        // else — persist locally for this viewer only, don't touch the DB.
        markBroadcastReadLocally(id);
      } else {
        await supabase.from("institution_notifications").update({ read: true }).eq("id", id);
      }

      set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      }));
    }
  };
});
