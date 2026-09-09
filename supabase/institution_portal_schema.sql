-- ============================================================
-- Chronova AI — Institution Portal Schema Additions (PHASE 1)
-- ============================================================
-- DO NOT RUN YET — for review only, pending approval.
-- Once approved, run this entire file in the Supabase SQL Editor
-- AFTER supabase/schema.sql has already been applied (these tables
-- reference public.institutions and public.profiles, which live there).
--
-- This file only ADDS new tables. It does not alter, drop, or rename
-- anything in supabase/schema.sql.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. INSTITUTION MEMBERS
-- Links an authenticated user to an institution with a role.
-- This becomes the source of truth for "who is an admin/teacher/
-- student of institution X" — profiles.role/institution_id are left
-- as-is (unused by new code, not removed).
-- ─────────────────────────────────────────────
create table if not exists public.institution_members (
  id             uuid primary key default uuid_generate_v4(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  role           text not null default 'student', -- 'admin' | 'teacher' | 'student'
  created_at     timestamptz default now(),
  unique (institution_id, user_id)
);

alter table public.institution_members enable row level security;

-- A user can see their own membership row(s) (used to resolve role on login).
create policy "Members can view own membership" on public.institution_members
  for select using (auth.uid() = user_id);

-- The institution's admin can view and manage every membership row for
-- their institution (add/remove members, change roles).
create policy "Institution admins manage memberships" on public.institution_members
  for all using (
    auth.uid() = (select admin_id from public.institutions where id = institution_id)
  );

-- ─────────────────────────────────────────────
-- 2. TEACHER PROFILES
-- Auth-linked profile for a teacher who has signed up. Distinct from
-- public.teachers (the admin-managed roster/scheduling entity used by
-- institution_timetables) — see note above the file header.
-- ─────────────────────────────────────────────
create table if not exists public.teacher_profiles (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  institution_id     uuid not null references public.institutions(id) on delete cascade,
  name               text not null,
  email              text,
  subjects           text[],
  max_hours_per_week integer default 20,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  unique (user_id, institution_id)
);

alter table public.teacher_profiles enable row level security;

-- A teacher can view and update their own profile.
create policy "Teachers manage own profile" on public.teacher_profiles
  for select using (auth.uid() = user_id);
create policy "Teachers update own profile" on public.teacher_profiles
  for update using (auth.uid() = user_id);

-- The institution's admin has full CRUD over every teacher profile in
-- their institution (create on invite, edit, remove).
create policy "Institution admins manage teacher profiles" on public.teacher_profiles
  for all using (
    auth.uid() = (select admin_id from public.institutions where id = institution_id)
  );

-- ─────────────────────────────────────────────
-- 3. TEACHER REQUESTS
-- Teacher-initiated requests (reschedule / swap / leave / substitution)
-- that an admin approves or rejects.
-- ─────────────────────────────────────────────
create table if not exists public.teacher_requests (
  id             uuid primary key default uuid_generate_v4(),
  teacher_id     uuid not null references public.teacher_profiles(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  type           text not null,                 -- 'reschedule' | 'swap' | 'leave' | 'substitution'
  details        jsonb default '{}'::jsonb,      -- e.g. { timetableEntryId, requestedDate, reason, ... }
  status         text not null default 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at     timestamptz default now(),
  resolved_at    timestamptz
);

alter table public.teacher_requests enable row level security;

-- A teacher can view and create their own requests.
create policy "Teachers view own requests" on public.teacher_requests
  for select using (
    auth.uid() = (select user_id from public.teacher_profiles where id = teacher_id)
  );
create policy "Teachers create own requests" on public.teacher_requests
  for insert with check (
    auth.uid() = (select user_id from public.teacher_profiles where id = teacher_id)
  );

-- The institution's admin can view and update (approve/reject) every
-- request for their institution.
create policy "Institution admins manage requests" on public.teacher_requests
  for all using (
    auth.uid() = (select admin_id from public.institutions where id = institution_id)
  );

-- ─────────────────────────────────────────────
-- 4. INSTITUTION NOTIFICATIONS
-- In-app notifications between institution members. to_user_id = null
-- means a broadcast to everyone matching role_target within the institution.
-- Distinct from public.notifications (personal student-facing notifications).
-- ─────────────────────────────────────────────
create table if not exists public.institution_notifications (
  id             uuid primary key default uuid_generate_v4(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  from_user_id   uuid references public.profiles(id) on delete set null,
  to_user_id     uuid references public.profiles(id) on delete cascade, -- null = broadcast per role_target
  role_target    text default 'all',   -- 'admin' | 'teacher' | 'all' (used when to_user_id is null)
  title          text not null,
  message        text,
  read           boolean default false,
  created_at     timestamptz default now()
);

alter table public.institution_notifications enable row level security;

-- A member can see notifications addressed directly to them, OR
-- broadcasts to their institution that match their role (or target "all").
create policy "Members view own or broadcast notifications" on public.institution_notifications
  for select using (
    auth.uid() = to_user_id
    or (
      to_user_id is null
      and exists (
        select 1 from public.institution_members im
        where im.institution_id = institution_notifications.institution_id
          and im.user_id = auth.uid()
          and (institution_notifications.role_target = 'all' or institution_notifications.role_target = im.role)
      )
    )
  );

-- Any institution member can send a notification (teacher -> admin on
-- request submission, admin -> teacher(s) on broadcast/approval), as
-- long as they're sending as themselves within their own institution.
create policy "Members send notifications in own institution" on public.institution_notifications
  for insert with check (
    auth.uid() = from_user_id
    and exists (
      select 1 from public.institution_members im
      where im.institution_id = institution_notifications.institution_id
        and im.user_id = auth.uid()
    )
  );

-- Only the direct recipient can mark their own notification as read.
create policy "Recipients mark own notifications read" on public.institution_notifications
  for update using (auth.uid() = to_user_id);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index if not exists idx_institution_members_user on public.institution_members(user_id);
create index if not exists idx_institution_members_institution on public.institution_members(institution_id);
create index if not exists idx_teacher_profiles_user on public.teacher_profiles(user_id);
create index if not exists idx_teacher_profiles_institution on public.teacher_profiles(institution_id);
create index if not exists idx_teacher_requests_institution on public.teacher_requests(institution_id);
create index if not exists idx_teacher_requests_teacher on public.teacher_requests(teacher_id);
create index if not exists idx_teacher_requests_status on public.teacher_requests(status);
create index if not exists idx_institution_notifications_institution on public.institution_notifications(institution_id);
create index if not exists idx_institution_notifications_to_user on public.institution_notifications(to_user_id);
create index if not exists idx_institution_notifications_read on public.institution_notifications(read);
