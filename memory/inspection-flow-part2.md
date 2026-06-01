---
name: inspection-flow-part2
description: RoomMark room assessment screen with AI pipeline, edge function, and item review — Part 2 of 2
metadata:
  type: project
---

Inspection flow Part 2 built on 2026-06-01. Covers the room assessment screen (RECORDING + REVIEW states), the process-room-observation edge function (Whisper + Claude), and the typed client helper library.

**Why:** Sixth build milestone — the core voice-to-AI pipeline is in place. Inspectors can record observations (after EAS rebuild), get AI-structured assessments, and review/edit items with C/U/W toggles.

**How to apply:**

**Edge Function** (`supabase/functions/process-room-observation/index.ts`):
- Accepts POST with audio base64 + room context + prescribed items list
- Step 1: Whisper transcription (OpenAI API)
- Step 2: Claude structuring with detailed system prompt including WA-specific context
- Step 3: JSON parse with graceful fallback — returns status 200 even on errors
- JWT auth verification against Supabase
- Model from `ANTHROPIC_MODEL` env var with fallback `claude-sonnet-4-20250514` (Rule 8)
- NOT yet deployed — developer deploys after review

**Client Lib** (`lib/edgeFunction.ts`):
- `processRoomObservation()` — typed wrapper returning `RoomAssessmentResult` union
- `arrayBufferToBase64()` — chunked encoding (Rule 7, chunkSize 8192)

**Room Assessment Screen** (`app/(app)/inspection/[id]/room/[roomId].tsx`):
- Two states: RECORDING and REVIEW
- Recording: pulse-animated record button, timer, waveform visualization, hint text, skip button
- Multiple recordings stored as URI array, most recent sent to AI
- Processing overlay (Transcribing → Analysing)
- Review: overall condition badge (tap to cycle good/fair/poor)
- Items list with C/U/W toggles (Y=green/N=red/—=grey)
- W toggle hidden for structural items (hasWorking: false)
- Notes preview + tap-to-edit modal
- Flagged items: amber banner + resolver bottom sheet
- Add custom item modal
- Debounced saves 800ms (optimistic UI, revert on error)
- Photo capture placeholder (Alert explaining EAS rebuild needed)
- Bottom bar: Back + Done (auto-marks room complete if items assessed)

**Types added** (`lib/types.ts`):
- `RoomPhoto`, `MaintenanceItem`, `MaintenanceItemInsert`
- `AssessedItem`, `MaintenanceItemSuggestion`, `ClaudeRoomAssessment`
- `EdgeFunctionRequest`, `RoomAssessmentResult`
- `QueuedRecording`

**Key files created/modified:**
- `supabase/functions/process-room-observation/index.ts` — edge function (created)
- `lib/edgeFunction.ts` — typed client + chunked base64 helper (created)
- `lib/types.ts` — AI and maintenance item types (modified)
- `app/(app)/inspection/[id]/room/[roomId].tsx` — full assessment screen (replaced stub)
- `tsconfig.json` — excluded supabase/functions from TS check

**⚠️ EAS rebuild required for:**
- expo-audio (useAudioRecorder)
- expo-file-system (File class)
- expo-image-manipulator (photo compression)
- expo-image-picker (not yet installed; photo capture placeholder shown)
