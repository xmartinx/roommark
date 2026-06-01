---
name: auth-flow-complete
description: RoomMark auth flow — welcome, sign-up, sign-in, profile-setup, and profile-aware routing
metadata:
  type: project
---

Complete authentication flow built on 2026-06-01. Users can create accounts, sign in, and set up their profile. The entry point redirects based on auth and profile state.

**Why:** Third build milestone — the auth flow is end-to-end functional. Supabase Auth handles email/password. The profile is stored in `public.profiles` with an auth trigger auto-creating the row on signup.

**How to apply:**
- Welcome screen shows value props and two CTAs
- Sign-up validates email/password client-side, calls `supabase.auth.signUp()`, then navigates to profile-setup
- Profile-setup uses `fetchProfileWithRetry` (Rule 9) to handle the auth trigger race condition, then upserts the profile
- Sign-in calls `supabase.auth.signInWithPassword()` and redirects to dashboard
- `app/index.tsx` handles 3 states: no session → welcome, incomplete profile → profile-setup, complete → dashboard
- `useAuth()` hook exposes: session, profile, loading, refreshProfile, signOut
- Sessions are in-memory only (no AsyncStorage). Persist across restarts requires EAS build for AsyncStorage.

**Key files:**
- `hooks/useAuth.ts` — auth state management with profile fetching
- `lib/profile.ts` — profile CRUD with retry pattern
- `components/Input.tsx` — reusable input with password toggle
- `components/Button.tsx` — reusable button with loading spinner
- `app/(auth)/welcome.tsx`, `sign-up.tsx`, `sign-in.tsx`, `profile-setup.tsx` — auth screens
- `app/index.tsx` — profile-aware root redirect
- `app/(app)/index.tsx` — dashboard stub with sign-out
