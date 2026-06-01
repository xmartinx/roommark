---
name: database-migrated
description: RoomMark Supabase database schema deployed with all 8 tables, RLS, auth trigger, and storage buckets
metadata:
  type: project
---

Supabase database fully migrated on 2026-06-01. Project ref: `uhvxizhmakkmejktwann`.

**Why:** Second build milestone — all 8 tables from PROJECT_BRIEF.md deployed to production Supabase with full RLS, the auth trigger for auto-creating profiles on signup, and two private storage buckets for inspection photos and PDFs.

**How to apply:** The database is ready for the next task: Auth flow implementation (sign in, sign up, profile management). All tables have RLS enforcing user_id = auth.uid() ownership. Storage paths follow {user_id}/{inspection_id}/{filename} pattern.
