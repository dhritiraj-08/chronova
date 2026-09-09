-- ============================================================
-- Chronova AI — Supabase Database Schema
-- ============================================================
-- Run this entire file in your Supabase project's SQL Editor
-- (https://app.supabase.com → your project → SQL Editor → New Query)
-- ============================================================

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- USERS PROFILE TABLE
-- (extends Supabase auth.users)
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text,
  age             integer,
  education_level text,           -- 'school' | 'college' | 'university'
  role            text default 'student', -- 'student' | 'admin'
  goals           text[],
  sleep_start     time,           -- e.g. 23:00
  sleep_end       time,           -- e.g. 07:00
  institution_id  uuid,
  onboarded       boolean default false,
  avatar_url      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- SUBJECTS
-- ─────────────────────────────────────────────
create table if not exists public.subjects (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references public.profiles(id) on delete cascade,
  subject_name     text not null,
  difficulty_level integer default 3, -- 1 (easy) to 5 (hard)
  preferred_time   text,              -- 'morning' | 'afternoon' | 'evening' | 'night'
  priority         integer default 2, -- 1 (low) to 3 (high)
  color            text default '#6366f1',
  weekly_hours     integer default 2,
  created_at       timestamptz default now()
);

alter table public.subjects enable row level security;
create policy "Users manage own subjects" on public.subjects
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- SCHEDULES
-- ─────────────────────────────────────────────
create table if not exists public.schedules (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references public.profiles(id) on delete cascade,
  subject_id        uuid references public.subjects(id) on delete set null,
  title             text not null,
  description       text,
  start_time        timestamptz not null,
  end_time          timestamptz not null,
  completion_status text default 'pending', -- 'pending' | 'done' | 'missed' | 'rescheduled'
  session_type      text default 'study',   -- 'study' | 'break' | 'gym' | 'sleep' | 'hobby'
  is_ai_generated   boolean default false,
  color             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table public.schedules enable row level security;
create policy "Users manage own schedules" on public.schedules
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- PRODUCTIVITY SESSIONS (tracking)
-- ─────────────────────────────────────────────
create table if not exists public.sessions (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references public.profiles(id) on delete cascade,
  schedule_id      uuid references public.schedules(id) on delete set null,
  subject_id       uuid references public.subjects(id) on delete set null,
  started_at       timestamptz,
  ended_at         timestamptz,
  duration_minutes integer,
  focus_score      integer,  -- 1-100
  notes            text,
  created_at       timestamptz default now()
);

alter table public.sessions enable row level security;
create policy "Users manage own sessions" on public.sessions
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- CHAT HISTORY
-- ─────────────────────────────────────────────
create table if not exists public.chat_messages (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  role        text not null, -- 'user' | 'assistant'
  content     text not null,
  metadata    jsonb,         -- e.g. schedule suggestions attached
  created_at  timestamptz default now()
);

alter table public.chat_messages enable row level security;
create policy "Users manage own chat" on public.chat_messages
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- INSTITUTIONS
-- ─────────────────────────────────────────────
create table if not exists public.institutions (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  type         text,   -- 'school' | 'college' | 'university'
  admin_id     uuid references public.profiles(id),
  address      text,
  created_at   timestamptz default now()
);

alter table public.institutions enable row level security;
create policy "Admins manage own institution" on public.institutions
  for all using (auth.uid() = admin_id);

-- ─────────────────────────────────────────────
-- TEACHERS
-- ─────────────────────────────────────────────
create table if not exists public.teachers (
  id              uuid primary key default uuid_generate_v4(),
  institution_id  uuid references public.institutions(id) on delete cascade,
  name            text not null,
  subjects        text[],
  available_days  text[],  -- ['Monday','Tuesday',...]
  available_from  time,
  available_until time,
  created_at      timestamptz default now()
);

alter table public.teachers enable row level security;
create policy "Admins manage teachers" on public.teachers
  for all using (
    auth.uid() = (select admin_id from public.institutions where id = institution_id)
  );

-- ─────────────────────────────────────────────
-- CLASSROOMS
-- ─────────────────────────────────────────────
create table if not exists public.classrooms (
  id             uuid primary key default uuid_generate_v4(),
  institution_id uuid references public.institutions(id) on delete cascade,
  name           text not null,
  capacity       integer,
  type           text default 'classroom', -- 'classroom' | 'lab' | 'auditorium'
  created_at     timestamptz default now()
);

alter table public.classrooms enable row level security;
create policy "Admins manage classrooms" on public.classrooms
  for all using (
    auth.uid() = (select admin_id from public.institutions where id = institution_id)
  );

-- ─────────────────────────────────────────────
-- BATCHES / SECTIONS
-- ─────────────────────────────────────────────
create table if not exists public.batches (
  id             uuid primary key default uuid_generate_v4(),
  institution_id uuid references public.institutions(id) on delete cascade,
  name           text not null,  -- e.g. 'Class 10-A'
  student_count  integer,
  age_group      text,
  created_at     timestamptz default now()
);

alter table public.batches enable row level security;
create policy "Admins manage batches" on public.batches
  for all using (
    auth.uid() = (select admin_id from public.institutions where id = institution_id)
  );

-- ─────────────────────────────────────────────
-- INSTITUTION TIMETABLES
-- ─────────────────────────────────────────────
create table if not exists public.institution_timetables (
  id             uuid primary key default uuid_generate_v4(),
  institution_id uuid references public.institutions(id) on delete cascade,
  batch_id       uuid references public.batches(id) on delete cascade,
  teacher_id     uuid references public.teachers(id),
  classroom_id   uuid references public.classrooms(id),
  subject_name   text not null,
  day_of_week    text not null,   -- 'Monday' ... 'Friday'
  start_time     time not null,
  end_time       time not null,
  week_start     date,
  is_ai_generated boolean default true,
  created_at     timestamptz default now()
);

alter table public.institution_timetables enable row level security;
create policy "Admins manage timetables" on public.institution_timetables
  for all using (
    auth.uid() = (select admin_id from public.institutions where id = institution_id)
  );

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  title       text not null,
  body        text,
  type        text default 'reminder', -- 'reminder' | 'alert' | 'summary' | 'tip'
  is_read     boolean default false,
  scheduled_for timestamptz,
  created_at  timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "Users manage own notifications" on public.notifications
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────
create index if not exists idx_schedules_user_id on public.schedules(user_id);
create index if not exists idx_schedules_start_time on public.schedules(start_time);
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_chat_messages_user_id on public.chat_messages(user_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_institution_timetables_institution on public.institution_timetables(institution_id);
