- [Project initialized](project-initialized.md) — RoomMark Expo SDK 56 project scaffolded and ready for Supabase setup
- [Database migrated](database-migrated.md) — All 8 tables, RLS, auth trigger, and storage buckets deployed
- [Auth flow complete](auth-flow-complete.md) — Welcome, sign-up, sign-in, profile-setup, and profile-aware routing
- [Dashboard + Properties](dashboard-properties-flow.md) — Tab navigation, dashboard with inspections, properties CRUD
- [Inspection flow Part 1](inspection-flow-part1.md) — WA templates, 3-step wizard, room list hub with progress tracking
- [Inspection flow Part 2](inspection-flow-part2.md) — Room assessment screen, edge function, AI pipeline, item review

## 2026-06-03 — 2f7d3d1 — Real expo-audio recording implementation
- Implemented: Full expo-audio pipeline — useAudioRecorder hook, prepareToRecordAsync, record/stop, URI resolution via Paths.cache
- Known issues: Photo capture still placeholder (expo-image-picker not installed)
- Next priority: EAS build verification — test recording end-to-end on device

## 2026-06-02 — docs: add workflow improvement rules
- Implemented: Code completion rule, post-build activation checklist, verification requirements, session start checklist, memory file maintenance, forcing function pattern
- Next priority: Follow the session start checklist at the beginning of every session
