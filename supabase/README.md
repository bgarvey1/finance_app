# Apply the Finance Tutor schema in Supabase

This guide walks you through loading the database schema and seed content for the MVP.

You only need to do this once per Supabase project.

---

## What this will create

Tables (with Row Level Security enabled):
- modules, lessons, questions (read-only content for authenticated users)
- profiles (per-user profile)
- progress (per-user lesson status)
- attempts (per-user question attempts)
- xp_events (per-user XP)

Policies:
- Authenticated users can read content tables
- Users can only read/insert/update their own rows in profiles, progress, attempts, xp_events

Seed content:
- Module: Time Value of Money (slug: `tvm`)
- Lesson: PV and FV Basics (slug: `pv-fv-basics`)
- 3 starter questions (2 MCQ, 1 numeric)

File to run:
- `supabase/schema.sql` (already in this repo)

---

## Steps (Dashboard)

1) Open your Supabase project
   - URL: https://onhycttmrifisdurufxu.supabase.co (or Project → Open)

2) Go to SQL Editor
   - Left sidebar → SQL → New query

3) Paste the schema
   - Open this repo file `supabase/schema.sql`
   - Copy ALL the contents and paste into the SQL Editor

4) Run the script
   - Click “Run”
   - You should see “success” notices. The statements are idempotent (they use IF NOT EXISTS / ON CONFLICT DO NOTHING) so it’s safe to run again.

5) Verify tables exist
   - Left sidebar → Table Editor
   - You should see: `modules, lessons, questions, profiles, progress, attempts, xp_events`

6) Verify RLS policies
   - Click each table → “RLS” tab
   - You should see the policies created by the script (e.g., `modules_select_auth`, `profiles_select_own`, etc.)

7) Verify seed content
   - In SQL Editor, run:
     ```sql
     select id, slug, title from public.modules order by id;
     select id, slug, title from public.lessons order by id;
     select count(*) from public.questions;
     ```
   - Expected: one `tvm` module, one `pv-fv-basics` lesson, and 3 questions.

Troubleshooting
- If you get an “object already exists” warning: it’s safe to ignore (script is designed to be re-runnable).
- If you see permission errors selecting tables from the app, make sure you are signed in (RLS allows only authenticated reads of content).
- If magic links don’t redirect correctly in the app, double‑check:
  - Authentication → Sign In / Providers → Email is enabled
  - Authentication → URL Configuration:
    - Site URL: `http://localhost:3000`
    - Additional Redirect URLs: `http://localhost:3000/auth/callback`

---

## Optional: quick sanity check from the app

1) Ensure you are signed in (email shows on the home page).
2) We’ll add pages to list modules/lessons next; for now the seed is only visible via SQL Editor.

---

## Next we will

- Add pages to fetch and display `modules` and `lessons` (rendering `content_md` with `react-markdown`)
- Build the PV/FV interactive calculator
- Implement the quiz flow (fetch questions → record attempts → award XP)
