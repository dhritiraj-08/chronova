// Rules-based scheduling engine
// Validates AI-generated schedules and applies hard constraints

export interface TimeSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface ScheduleSession {
  title: string;
  subject: string;
  type: "study" | "break" | "gym" | "sleep" | "hobby" | "class";
  start: string;
  end: string;
  priority?: "high" | "medium" | "low";
  notes?: string;
  color?: string;
}

export interface UserConstraints {
  sleepStart: string;     // "23:00"
  sleepEnd: string;       // "07:00"
  minBreakMinutes: number;// 15
  maxContinuousStudy: number; // 90 (minutes)
  collegeHours?: { start: string; end: string };
}

// Convert "HH:MM" to minutes since midnight
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Convert minutes since midnight to "HH:MM"
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Check if two slots overlap
export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  const aStart = timeToMinutes(a.start);
  const aEnd = timeToMinutes(a.end);
  const bStart = timeToMinutes(b.start);
  const bEnd = timeToMinutes(b.end);
  return aStart < bEnd && bStart < aEnd;
}

// Check if a slot falls within sleep hours
export function isDuringSleep(
  slot: TimeSlot,
  sleepStart: string,
  sleepEnd: string
): boolean {
  const slotStart = timeToMinutes(slot.start);
  const slotEnd = timeToMinutes(slot.end);
  const sStart = timeToMinutes(sleepStart);
  const sEnd = timeToMinutes(sleepEnd);

  // Sleep crosses midnight
  if (sStart > sEnd) {
    return slotStart >= sStart || slotEnd <= sEnd || slotStart < sEnd;
  }
  return slotsOverlap(slot, { start: sleepStart, end: sleepEnd });
}

// Duration of a slot in minutes
export function slotDuration(slot: TimeSlot): number {
  const start = timeToMinutes(slot.start);
  const end = timeToMinutes(slot.end);
  return end > start ? end - start : 24 * 60 - start + end;
}

// Validate and fix a day's sessions
export function validateDaySessions(
  sessions: ScheduleSession[],
  constraints: UserConstraints
): { valid: ScheduleSession[]; warnings: string[] } {
  const warnings: string[] = [];
  const valid: ScheduleSession[] = [];

  // Sort by start time
  const sorted = [...sessions].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  for (const session of sorted) {
    const slot: TimeSlot = { start: session.start, end: session.end };

    // Skip sessions during sleep
    if (
      session.type !== "sleep" &&
      isDuringSleep(slot, constraints.sleepStart, constraints.sleepEnd)
    ) {
      warnings.push(
        `Skipped "${session.title}" — overlaps with sleep hours`
      );
      continue;
    }

    // Check for overlaps with already validated sessions
    const hasOverlap = valid.some((v) =>
      slotsOverlap(slot, { start: v.start, end: v.end })
    );

    if (hasOverlap) {
      warnings.push(`Skipped "${session.title}" — time conflict`);
      continue;
    }

    // Check continuous study limit
    const duration = slotDuration(slot);
    if (session.type === "study" && duration > constraints.maxContinuousStudy) {
      warnings.push(
        `"${session.title}" is ${duration}min — exceeds max continuous study of ${constraints.maxContinuousStudy}min`
      );
    }

    valid.push(session);
  }

  return { valid, warnings };
}

// Suggest a break if needed between consecutive study sessions
export function insertBreaks(
  sessions: ScheduleSession[],
  breakMinutes: number = 15
): ScheduleSession[] {
  const result: ScheduleSession[] = [];
  const sorted = [...sessions].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  for (let i = 0; i < sorted.length; i++) {
    result.push(sorted[i]);

    if (i < sorted.length - 1) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const gap = timeToMinutes(next.start) - timeToMinutes(current.end);

      if (
        sorted[i].type === "study" &&
        sorted[i + 1].type === "study" &&
        gap < breakMinutes
      ) {
        // Insert a break
        const breakStart = current.end;
        const breakEnd = minutesToTime(
          timeToMinutes(current.end) + breakMinutes
        );
        result.push({
          title: "Short Break",
          subject: "break",
          type: "break",
          start: breakStart,
          end: breakEnd,
          notes: "Rest your mind",
        });
      }
    }
  }

  return result;
}

// Score a schedule (0-100) based on quality metrics
export function scoreSchedule(
  sessions: ScheduleSession[],
  constraints: UserConstraints
): number {
  let score = 100;

  const studySessions = sessions.filter((s) => s.type === "study");

  // Penalize very long sessions
  for (const s of studySessions) {
    const dur = slotDuration({ start: s.start, end: s.end });
    if (dur > 120) score -= 10;
    if (dur > constraints.maxContinuousStudy) score -= 15;
  }

  // Reward balanced distribution
  const hasBreaks = sessions.some((s) => s.type === "break");
  if (!hasBreaks && studySessions.length > 2) score -= 20;

  // Check sleep protection
  const sleepViolations = sessions.filter(
    (s) =>
      s.type !== "sleep" &&
      isDuringSleep(
        { start: s.start, end: s.end },
        constraints.sleepStart,
        constraints.sleepEnd
      )
  );
  score -= sleepViolations.length * 15;

  return Math.max(0, Math.min(100, score));
}

// ─────────────────────────────────────────────
// RULES-BASED SCHEDULE GENERATORS
// (Bypasses AI API calls for core scheduling)
// ─────────────────────────────────────────────

export function generateRulesBasedSchedule(profile: any): any {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const subjects = profile.subjects || [];
  const sleepStart = profile.sleep_start || "23:00";
  const sleepEnd = profile.sleep_end || "07:00";
  const collegeStart = profile.college_start || "09:00";
  const collegeEnd = profile.college_end || "15:00";
  const weakSubjects = profile.weak_subjects || [];

  // Sort subjects: weak subjects first, then by difficulty descending
  const sortedSubjects = [...subjects].sort((a, b) => {
    const aWeak = weakSubjects.includes(a.name) ? 1 : 0;
    const bWeak = weakSubjects.includes(b.name) ? 1 : 0;
    if (aWeak !== bWeak) return bWeak - aWeak;
    return (b.difficulty || 3) - (a.difficulty || 3);
  });

  let subjectIndex = 0;
  const schedule = days.map((day) => {
    const isWeekday = day !== "Saturday" && day !== "Sunday";
    const sessions: ScheduleSession[] = [];

    // Weekday college class
    if (isWeekday) {
      sessions.push({
        title: "College Classes",
        subject: "College",
        type: "class",
        start: collegeStart,
        end: collegeEnd,
        priority: "medium",
        notes: "Attend regular lectures"
      });
    }

    // Allocate study blocks in available times
    if (sortedSubjects.length > 0) {
      if (isWeekday) {
        // Morning study block (e.g. 07:00 to 08:30)
        const sub1 = sortedSubjects[subjectIndex % sortedSubjects.length];
        sessions.push({
          title: `${sub1.name} Focus`,
          subject: sub1.name,
          type: "study",
          start: "07:00",
          end: "08:30",
          priority: weakSubjects.includes(sub1.name) ? "high" : "medium",
          notes: "Focus study session"
        });
        subjectIndex++;

        // Afternoon study block (e.g. 16:00 to 17:30)
        const sub2 = sortedSubjects[subjectIndex % sortedSubjects.length];
        sessions.push({
          title: `${sub2.name} Concept Study`,
          subject: sub2.name,
          type: "study",
          start: "16:00",
          end: "17:30",
          priority: weakSubjects.includes(sub2.name) ? "high" : "medium",
          notes: "Review textbook and notes"
        });
        subjectIndex++;

        // Evening study block (e.g. 18:00 to 19:30)
        const sub3 = sortedSubjects[subjectIndex % sortedSubjects.length];
        sessions.push({
          title: `${sub3.name} Practice`,
          subject: sub3.name,
          type: "study",
          start: "18:00",
          end: "19:30",
          priority: "medium",
          notes: "Solve exercise problems"
        });
        subjectIndex++;

        // Night review session (e.g. 20:00 to 21:00)
        sessions.push({
          title: "Daily Revision",
          subject: "Revision",
          type: "study",
          start: "20:00",
          end: "21:00",
          priority: "low",
          notes: "Quick recap of today's topics"
        });
      } else {
        // Weekend has no college, so we can schedule study blocks spaced out
        // Morning Session 1 (09:00 - 10:30)
        const sub1 = sortedSubjects[subjectIndex % sortedSubjects.length];
        sessions.push({
          title: `${sub1.name} Focus`,
          subject: sub1.name,
          type: "study",
          start: "09:00",
          end: "10:30",
          priority: "high",
          notes: "Deep study session"
        });
        subjectIndex++;

        // Morning Session 2 (11:00 - 12:30)
        const sub2 = sortedSubjects[subjectIndex % sortedSubjects.length];
        sessions.push({
          title: `${sub2.name} Theory`,
          subject: sub2.name,
          type: "study",
          start: "11:00",
          end: "12:30",
          priority: "medium",
          notes: "Read reference material"
        });
        subjectIndex++;

        // Afternoon Session 3 (14:30 - 16:00)
        const sub3 = sortedSubjects[subjectIndex % sortedSubjects.length];
        sessions.push({
          title: `${sub3.name} Practice`,
          subject: sub3.name,
          type: "study",
          start: "14:30",
          end: "16:00",
          priority: "medium",
          notes: "Attempt past paper questions"
        });
        subjectIndex++;

        // Evening Session 4 (17:00 - 18:30)
        const sub4 = sortedSubjects[subjectIndex % sortedSubjects.length];
        sessions.push({
          title: `${sub4.name} Review`,
          subject: sub4.name,
          type: "study",
          start: "17:00",
          end: "18:30",
          priority: "low",
          notes: "Consolidate learning"
        });
        subjectIndex++;
      }
    }

    // Apply engine validations and insert breaks
    const userConstraints = {
      sleepStart,
      sleepEnd,
      minBreakMinutes: 15,
      maxContinuousStudy: 90
    };

    const validated = validateDaySessions(sessions, userConstraints).valid;
    const finalSessions = insertBreaks(validated, 15);

    return {
      day,
      sessions: finalSessions
    };
  });

  const summary = `Generated rules-based schedule for ${profile.name || "Student"} based on ${subjects.length} subjects. Weak subjects (${weakSubjects.join(", ") || "none"}) have been prioritized with high-priority slots in morning study windows. Sleep hours (${sleepStart}-${sleepEnd}) and college hours (${collegeStart}-${collegeEnd}) have been strictly preserved.`;

  const recommendations = [
    "Prioritize your morning focus window (07:00 - 08:30) for your weakest subjects when your cognitive load is lowest.",
    "Make sure to stand up and walk around during the 15-minute breaks to maintain high focus levels.",
    "Revision at the end of the day helps shift concepts from short-term to long-term memory."
  ];

  return {
    schedule,
    summary,
    recommendations
  };
}

export function rescheduleMissedSessions(
  missedSessions: any[],
  remainingDays: string[],
  constraints: any
): any {
  const rescheduled: any[] = [];
  let dayIndex = 0;

  missedSessions.forEach((session) => {
    if (remainingDays.length === 0) return;
    const targetDay = remainingDays[dayIndex % remainingDays.length];
    
    rescheduled.push({
      original_title: session.subject || session.title,
      new_day: targetDay,
      new_start: "16:00",
      new_end: "17:30",
      notes: `Rescheduled from missed session. Focus on catch-up.`
    });
    dayIndex++;
  });

  return { rescheduled };
}

export function generateInstitutionTimetable(institution: any): any {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const periods = [
    { start: "08:30", end: "09:30" },
    { start: "09:30", end: "10:30" },
    { start: "10:30", end: "11:30" },
    { start: "11:30", end: "12:30", isBreak: true }, // Lunch break
    { start: "12:30", end: "13:30" },
    { start: "13:30", end: "14:30" }
  ];

  const subjects = institution.subjects || [];
  const teachers = institution.teachers || [];
  const classrooms = institution.classrooms || [];

  const timetable: any[] = [];
  let subjectIndex = 0;

  days.forEach((day) => {
    periods.forEach((period) => {
      if (period.isBreak) {
        timetable.push({
          day_of_week: day,
          start_time: period.start,
          end_time: period.end,
          subject_name: "Lunch Break",
          teacher_name: "N/A",
          classroom_name: "Cafeteria"
        });
        return;
      }

      if (subjects.length === 0) return;

      const subjectObj = subjects[subjectIndex % subjects.length];
      const subjectName = typeof subjectObj === "string" ? subjectObj : (subjectObj.name || subjectObj.subject_name || "Study period");
      
      // Find a teacher who teaches this subject, or default
      const teacher = teachers.find((t: any) => t.subjects?.includes(subjectName)) || teachers[0] || { name: "Staff" };
      
      // Assign classroom
      const classroom = classrooms[subjectIndex % classrooms.length] || { name: "Room 101" };

      timetable.push({
        day_of_week: day,
        start_time: period.start,
        end_time: period.end,
        subject_name: subjectName,
        teacher_name: teacher.name || "Staff",
        classroom_name: classroom.name || "Room 101"
      });

      subjectIndex++;
    });
  });

  return { timetable };
}
