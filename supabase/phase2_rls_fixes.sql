-- ============================================================
-- Institution Portal — RLS fixes, v2 (supersedes the v1 that was just run)
-- ============================================================
-- RUN THIS IMMEDIATELY — the previously-run version of this file put
-- the database in a broken state: it added a policy on `institutions`
-- that checks `institution_members`, whose own existing policy checks
-- `institutions` right back. Postgres detects that cycle and refuses
-- the query ("infinite recursion detected in policy for relation
-- institutions", error 42P17) — which currently breaks /admin for
-- every admin, not just the new /teacher pages.
--
-- This file is a complete, corrected replacement. Every `drop policy
-- if exists` + `create policy` below is idempotent — safe to run even
-- though some of these policies already exist from the previous run.
-- Run this whole file now; no need to undo anything first.
--
-- Root cause and fix: the cycle exists because two tables' policies
-- each queried the OTHER table directly, and every plain SQL query —
-- including one that appears only inside another table's own RLS
-- policy — is itself subject to RLS on the table it reads. Three
-- SECURITY DEFINER helper functions below break the cycle: they run
-- with the function owner's privileges, so the reads happening INSIDE
-- them bypass RLS entirely and can never re-trigger policy evaluation.
-- Every policy that needs to check "is this user the admin / a member
-- of this institution" now goes through one of these functions instead
-- of a raw subquery, so no such cycle can occur anywhere in the schema.
-- ============================================================

create or replace function public.is_institution_admin(target_institution_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from institutions
    where id = target_institution_id
      and admin_id = auth.uid()
  );
$$;

create or replace function public.is_institution_member(target_institution_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from institution_members
    where institution_id = target_institution_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.my_institution_role(target_institution_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from institution_members
  where institution_id = target_institution_id
    and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.teacher_profile_owner(target_teacher_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select user_id from teacher_profiles where id = target_teacher_id;
$$;

-- ─────────────────────────────────────────────
-- institutions
-- ─────────────────────────────────────────────
drop policy if exists "Members can view their own institution" on public.institutions;
create policy "Members can view their own institution" on public.institutions
  for select using (public.is_institution_member(id));
-- "Admins manage own institution" (auth.uid() = admin_id, a plain column
-- check with no subquery) is untouched — it never recursed.

-- ─────────────────────────────────────────────
-- teachers / classrooms / batches / institution_timetables
-- Replace the original schema.sql admin policy's raw subquery with the
-- helper function, and route the new member-view policy through it too.
-- ─────────────────────────────────────────────
drop policy if exists "Admins manage teachers" on public.teachers;
create policy "Admins manage teachers" on public.teachers
  for all using (public.is_institution_admin(institution_id));

drop policy if exists "Members can view teachers in their institution" on public.teachers;
create policy "Members can view teachers in their institution" on public.teachers
  for select using (public.is_institution_member(institution_id));

drop policy if exists "Admins manage classrooms" on public.classrooms;
create policy "Admins manage classrooms" on public.classrooms
  for all using (public.is_institution_admin(institution_id));

drop policy if exists "Members can view classrooms in their institution" on public.classrooms;
create policy "Members can view classrooms in their institution" on public.classrooms
  for select using (public.is_institution_member(institution_id));

drop policy if exists "Admins manage batches" on public.batches;
create policy "Admins manage batches" on public.batches
  for all using (public.is_institution_admin(institution_id));

drop policy if exists "Members can view batches in their institution" on public.batches;
create policy "Members can view batches in their institution" on public.batches
  for select using (public.is_institution_member(institution_id));

drop policy if exists "Admins manage timetables" on public.institution_timetables;
create policy "Admins manage timetables" on public.institution_timetables
  for all using (public.is_institution_admin(institution_id));

drop policy if exists "Members can view timetables in their institution" on public.institution_timetables;
create policy "Members can view timetables in their institution" on public.institution_timetables
  for select using (public.is_institution_member(institution_id));

-- ─────────────────────────────────────────────
-- institution_members
-- ─────────────────────────────────────────────
drop policy if exists "Institution admins manage memberships" on public.institution_members;
create policy "Institution admins manage memberships" on public.institution_members
  for all using (public.is_institution_admin(institution_id));
-- "Members can view own membership" (auth.uid() = user_id) is untouched.

-- ─────────────────────────────────────────────
-- teacher_profiles
-- ─────────────────────────────────────────────
drop policy if exists "Institution admins manage teacher profiles" on public.teacher_profiles;
create policy "Institution admins manage teacher profiles" on public.teacher_profiles
  for all using (public.is_institution_admin(institution_id));
-- "Teachers manage own profile" / "Teachers update own profile"
-- (auth.uid() = user_id) are untouched.

-- ─────────────────────────────────────────────
-- teacher_requests
-- ─────────────────────────────────────────────
drop policy if exists "Teachers view own requests" on public.teacher_requests;
create policy "Teachers view own requests" on public.teacher_requests
  for select using (auth.uid() = public.teacher_profile_owner(teacher_id));

drop policy if exists "Teachers create own requests" on public.teacher_requests;
create policy "Teachers create own requests" on public.teacher_requests
  for insert with check (auth.uid() = public.teacher_profile_owner(teacher_id));

drop policy if exists "Institution admins manage requests" on public.teacher_requests;
create policy "Institution admins manage requests" on public.teacher_requests
  for all using (public.is_institution_admin(institution_id));

-- ─────────────────────────────────────────────
-- institution_notifications
-- ─────────────────────────────────────────────
drop policy if exists "Members view own or broadcast notifications" on public.institution_notifications;
drop policy if exists "Members view own, sent, or broadcast notifications" on public.institution_notifications;
create policy "Members view own, sent, or broadcast notifications" on public.institution_notifications
  for select using (
    auth.uid() = to_user_id
    or auth.uid() = from_user_id
    or (
      to_user_id is null
      and (role_target = 'all' or role_target = public.my_institution_role(institution_id))
    )
  );

drop policy if exists "Members send notifications in own institution" on public.institution_notifications;
create policy "Members send notifications in own institution" on public.institution_notifications
  for insert with check (
    auth.uid() = from_user_id
    and public.is_institution_member(institution_id)
  );
-- "Recipients mark own notifications read" (auth.uid() = to_user_id) is untouched.
