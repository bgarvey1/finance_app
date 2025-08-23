-- Adaptive tutor: event logging and per-concept stats
-- Idempotent schema: safe to run multiple times

begin;

-- panel_events: logs each user interaction with the tutor/panels/questions
create table if not exists public.panel_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  event_type text not null check (event_type in ('panel_viewed','feedback','question_answered','ask')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- user_concept_stats: rolling stats per user and concept
create table if not exists public.user_concept_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_tag text not null,
  accuracy float8 not null default 0,     -- rolling fraction correct (0..1)
  seen_count int not null default 0,      -- number of question exposures on this concept
  last_seen timestamptz not null default now(),
  mastery float8 not null default 0,      -- simple mirror of accuracy for now; can swap to IRT later
  primary key (user_id, concept_tag)
);

-- Enable RLS
alter table public.panel_events enable row level security;
alter table public.user_concept_stats enable row level security;

-- Policies: users read/write only their rows
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='panel_events' and policyname='panel_events_select_own') then
    create policy panel_events_select_own on public.panel_events
      for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='panel_events' and policyname='panel_events_insert_own') then
    create policy panel_events_insert_own on public.panel_events
      for insert to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_concept_stats' and policyname='ucs_select_own') then
    create policy ucs_select_own on public.user_concept_stats
      for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_concept_stats' and policyname='ucs_upsert_own') then
    create policy ucs_insert_own on public.user_concept_stats
      for insert to authenticated
      with check (user_id = auth.uid());
    create policy ucs_update_own on public.user_concept_stats
      for update to authenticated
      using (user_id = auth.uid());
  end if;
end$$;

commit;
