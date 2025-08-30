
begin;

create table if not exists public.pre_generated_panels (
  id bigserial primary key,
  lesson_slug text not null,
  topic_id text not null,
  topic_index int not null,
  step_type text not null check (step_type in ('panel', 'reteach', 'question', 'summary')),
  title text not null,
  body_md text not null,
  example_md text,
  concept_tags jsonb not null default '[]'::jsonb,
  
  quality_score float8 default 0 check (quality_score >= 0 and quality_score <= 10),
  is_approved boolean default false,
  is_active boolean default true,
  
  generated_with_model text default 'gpt-4o-mini',
  generation_prompt_hash text, -- hash of the prompt used to generate this content
  word_count_body int,
  word_count_example int,
  
  question_type text check (question_type in ('mcq', 'numeric') or question_type is null),
  question_prompt text,
  question_choices jsonb, -- for MCQ questions
  correct_answer text,
  explanation text,
  difficulty text check (difficulty in ('easy', 'medium', 'hard') or difficulty is null),
  
  generated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pre_generated_panels_lesson_topic 
  on public.pre_generated_panels(lesson_slug, topic_id, topic_index);

create index if not exists idx_pre_generated_panels_active_approved 
  on public.pre_generated_panels(is_active, is_approved) 
  where is_active = true and is_approved = true;

create index if not exists idx_pre_generated_panels_step_type 
  on public.pre_generated_panels(step_type);

create index if not exists idx_pre_generated_panels_quality 
  on public.pre_generated_panels(quality_score desc) 
  where is_active = true and is_approved = true;

create table if not exists public.content_selection_stats (
  id bigserial primary key,
  panel_id bigint not null references public.pre_generated_panels(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  lesson_slug text not null,
  topic_id text not null,
  selected_at timestamptz not null default now(),
  user_context jsonb default '{}'::jsonb -- stores context that influenced selection
);

-- Enable RLS
alter table public.pre_generated_panels enable row level security;
alter table public.content_selection_stats enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pre_generated_panels' and policyname='panels_select_approved') then
    create policy panels_select_approved on public.pre_generated_panels
      for select to authenticated 
      using (is_active = true and is_approved = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pre_generated_panels' and policyname='panels_admin_all') then
    create policy panels_admin_all on public.pre_generated_panels
      for all to service_role
      using (true)
      with check (true);
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='content_selection_stats' and policyname='selection_stats_insert') then
    create policy selection_stats_insert on public.content_selection_stats
      for insert to authenticated
      with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='content_selection_stats' and policyname='selection_stats_select_own') then
    create policy selection_stats_select_own on public.content_selection_stats
      for select to authenticated
      using (user_id = auth.uid() or user_id is null);
  end if;
end$$;

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_pre_generated_panels_updated_at on public.pre_generated_panels;
create trigger update_pre_generated_panels_updated_at
  before update on public.pre_generated_panels
  for each row execute function update_updated_at_column();

commit;
