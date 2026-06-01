---
name: dashboard-properties-flow
description: RoomMark dashboard with tab navigation, properties CRUD, and inspection/history/settings stubs
metadata:
  type: project
---

Dashboard and Properties flow built on 2026-06-01. The app now has 4-tab navigation (Home, Properties, History, Settings) with a fully functional dashboard and properties CRUD backed by Supabase.

**Why:** Fourth build milestone — the core navigation shell is in place and users can create properties, view them in a searchable list, and see recent inspections on the dashboard.

**How to apply:**
- `app/(app)/_layout.tsx` — Tabs layout with Ionicons, `inspection` tab hidden via `href: null`
- Dashboard queries `inspections` + `properties` tables, joins client-side, renders colored type/status badges
- Properties list fetches all user properties from Supabase, filters client-side by search text
- Add Property form inserts into `properties` table, defaults state to user's `default_state`
- Each tab route has its own Stack `_layout.tsx` for push-navigating to detail/create screens
- History and Settings are stubs; Inspection new/detail are stubs
- `@expo/vector-icons` installed (pure JS, no native code — no rebuild needed)

**Key files:**
- `app/(app)/_layout.tsx` — Tabs layout (4 tabs + hidden inspection stack)
- `app/(app)/index.tsx` — Full dashboard with inspection list
- `app/(app)/properties/index.tsx` — Searchable property list
- `app/(app)/properties/new.tsx` — Add property form with chip groups and state picker
- `lib/types.ts` — Shared database row types (Property, Inspection, InspectionWithProperty)
