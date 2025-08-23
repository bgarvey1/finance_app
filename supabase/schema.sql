-- Schema for Finance Tutor MVP (Supabase SQL)
-- Paste this into Supabase Dashboard → SQL Editor and run.
-- It creates tables, RLS policies, and seeds Module 1 (TVM) with one lesson and 3 questions.

-- Safe wrapper
begin;

-- Modules: high-level tracks
create table if not exists public.modules (
  id bigserial primary key,
  slug text unique not null,
  title text not null,
  description text default '',
  sort_order int default 0,
  created_at timestamptz not null default now()
);

-- Lessons within a module
create table if not exists public.lessons (
  id bigserial primary key,
  module_id bigint not null references public.modules(id) on delete cascade,
  slug text unique not null,
  title text not null,
  content_md text not null default '',
  sort_order int default 0,
  created_at timestamptz not null default now()
);

-- Questions for a lesson
-- type: 'mcq' or 'numeric'
create table if not exists public.questions (
  id bigserial primary key,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  type text not null check (type in ('mcq','numeric')),
  prompt text not null,
  choices jsonb,                 -- for MCQ [{id:"A",text:"..."},...]
  correct_answer text not null,  -- store as text ('A', '7', etc.)
  explanation text default '',
  sort_order int default 0,
  created_at timestamptz not null default now()
);

-- Profiles for users
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text default '',
  family_id uuid,
  avatar_url text default '',
  created_at timestamptz not null default now()
);

-- Progress per lesson
-- status: not_started | in_progress | done
create table if not exists public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  status text not null default 'not_started',
  last_seen timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Attempts per question
create table if not exists public.attempts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  answer text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

-- XP events (gamification)
create table if not exists public.xp_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  points int not null default 0,
  reason text not null default '',
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.attempts enable row level security;
alter table public.xp_events enable row level security;

-- Policies
-- Read-only content for authenticated users
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='modules' and policyname='modules_select_auth') then
    create policy modules_select_auth on public.modules
      for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lessons' and policyname='lessons_select_auth') then
    create policy lessons_select_auth on public.lessons
      for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='questions' and policyname='questions_select_auth') then
    create policy questions_select_auth on public.questions
      for select to authenticated using (true);
  end if;

  -- Profiles: user can read/write own
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_select_own') then
    create policy profiles_select_own on public.profiles
      for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_upsert_own') then
    create policy profiles_upsert_own on public.profiles
      for insert to authenticated
      with check (user_id = auth.uid());
    create policy profiles_update_own on public.profiles
      for update to authenticated
      using (user_id = auth.uid());
  end if;

  -- Progress: user can read/write own
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='progress' and policyname='progress_select_own') then
    create policy progress_select_own on public.progress
      for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='progress' and policyname='progress_upsert_own') then
    create policy progress_insert_own on public.progress
      for insert to authenticated
      with check (user_id = auth.uid());
    create policy progress_update_own on public.progress
      for update to authenticated
      using (user_id = auth.uid());
  end if;

  -- Attempts: user can read/write own
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='attempts' and policyname='attempts_select_own') then
    create policy attempts_select_own on public.attempts
      for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='attempts' and policyname='attempts_insert_own') then
    create policy attempts_insert_own on public.attempts
      for insert to authenticated
      with check (user_id = auth.uid());
  end if;

  -- XP: user can read/write own
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='xp_events' and policyname='xp_select_own') then
    create policy xp_select_own on public.xp_events
      for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='xp_events' and policyname='xp_insert_own') then
    create policy xp_insert_own on public.xp_events
      for insert to authenticated
      with check (user_id = auth.uid());
  end if;
end$$;

-- Seed Module 1: TVM
insert into public.modules (slug, title, description, sort_order)
values ('tvm', 'Time Value of Money', 'Understand why $1 today ≠ $1 tomorrow; compounding, PV/FV, and intuition.', 1)
on conflict (slug) do nothing;

-- Ensure we have the module_id for seed refs
with m as (
  select id from public.modules where slug = 'tvm' limit 1
)
insert into public.lessons (module_id, slug, title, content_md, sort_order)
select m.id,
       'pv-fv-basics',
       'PV and FV Basics',
       $MD$
What you will learn
- Why money has time value
- Simple vs compound interest
- Future Value (FV) and Present Value (PV)

Core formulas
- FV = PV × (1 + r)^n
- PV = FV / (1 + r)^n

Try it
- Use the calculator in this lesson to build intuition: how do rate (r) and years (n) change PV and FV?
$MD$,
       1
from m
on conflict (slug) do nothing;

-- Seed 3 questions for the lesson
with l as (
  select id from public.lessons where slug='pv-fv-basics' limit 1
)
insert into public.questions (lesson_id, type, prompt, choices, correct_answer, explanation, sort_order)
select l.id, 'mcq',
  'At 10% annual compounding, roughly how long does it take to double your money?',
  '[{"id":"A","text":"5 years"},{"id":"B","text":"7 years"},{"id":"C","text":"10 years"},{"id":"D","text":"12 years"}]'::jsonb,
  'B',
  'Rule of 72 ⇒ 72/10 ≈ 7.2 years.',
  1
from l
union all
select l.id, 'numeric',
  'What is the future value of $1,000 at 8% for 5 years? (Round to nearest dollar)',
  null,
  '1469',
  'FV = 1000 × (1.08)^5 ≈ 1,469.',
  2
from l
union all
select l.id, 'mcq',
  'If discount rate rises (r up), the present value of a given future cash flow will…',
  '[{"id":"A","text":"go up"},{"id":"B","text":"go down"},{"id":"C","text":"stay the same"},{"id":"D","text":"cannot tell"}]'::jsonb,
  'B',
  'Higher discounting shrinks PV: PV = FV / (1+r)^n.',
  3
from l
on conflict do nothing;

commit;
