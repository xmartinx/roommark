# CLAUDE.md — RoomMark

This file is read by Claude Code at the start of every session.
Read it completely before writing any code or running any command.

**Project:** RoomMark — AI-powered rental property inspection reports  
**Platform:** React Native / Expo SDK 56 / TypeScript strict  
**Project root:** `D:\Appbuilds\RoomMark`  
**Full context:** See PROJECT_BRIEF.md

---

## Your role in this project

You are the sole developer building RoomMark. The human's role is to
approve or reject each task, not to write code or relay instructions.

Operating rules:
- Make all technical decisions independently
- Never ask technical questions — research and decide
- Ask only when a decision requires spending money or a business choice
- Batch questions — never ask one at a time
- Treat this as a real commercial product, not a demo

---

## Critical rules — read before every session

These rules are derived from hard-won debugging in VoiceReport, the sister
app that shares this entire architecture. Every rule below cost at least
one day of debugging. None are theoretical.

---

### Rule 1 — Native modules require an EAS rebuild

**Before importing any newly installed package, check whether it contains
native code.**

```bash
# Check for native modules
ls node_modules/{package-name}/android
ls node_modules/{package-name}/ios
```

If either `android/` or `ios/` folder exists: the package is a native module.
Do NOT import it until after a successful EAS build. Importing a native module
before a rebuild causes a silent runtime crash or "module not found" error
that is extremely difficult to diagnose.

**Packages confirmed to be native modules in this project:**
- expo-audio
- expo-image-manipulator
- expo-print
- expo-sharing
- expo-file-system

**Workflow for installing a new native module:**
1. `npx expo install {package}`
2. Verify it has android/ or ios/ folder
3. Commit the change
4. Trigger EAS build
5. Install the new build on device
6. THEN import and use the package

---

### Rule 2 — Never use expo-av for audio

expo-av crashes on Android with SDK 56 with a `LazyKType` error.
**Always use expo-audio for all recording and playback.**

```typescript
// CORRECT
import { useAudioRecorder } from 'expo-audio'

// WRONG — DO NOT USE
import { Audio } from 'expo-av'
```

---

### Rule 3 — File system: use File class, not legacy API

expo-file-system's legacy `readAsStringAsync` throws in SDK 56.
**Always use the File class for reading files.**

```typescript
// CORRECT
import { File } from 'expo-file-system'
const file = new File(uri)
const base64 = await file.base64()

// WRONG — DO NOT USE
import * as FileSystem from 'expo-file-system'
const base64 = await FileSystem.readAsStringAsync(uri, {
  encoding: FileSystem.EncodingType.Base64
})
```

---

### Rule 4 — Supabase Storage uploads: base64-arraybuffer only

React Native's `{ uri, type, name }` FormData upload pattern produces
177-byte broken files when used with Supabase Storage in SDK 56.

**Always use base64-arraybuffer decode() for all file uploads.**

```typescript
// CORRECT
import { decode } from 'base64-arraybuffer'

const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload(path, decode(base64String), {
    contentType: 'audio/m4a',
    upsert: true
  })

// WRONG — produces broken 177-byte files
const formData = new FormData()
formData.append('file', { uri, type: 'audio/m4a', name: 'file.m4a' } as any)
```

---

### Rule 5 — Fetch does not support FormData file uploads in SDK 56

Expo SDK 56 fetch() does not support the `{ uri, type, name }` FormData
pattern for sending files. Send audio and files as JSON with base64 strings.

```typescript
// CORRECT — send as base64 in JSON body
const response = await fetch(edgeFunctionUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    audio_base64: base64String,
    room_name: roomName,
    // ... other fields
  })
})

// WRONG — fetch ignores the file data silently
const formData = new FormData()
formData.append('audio', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any)
```

---

### Rule 6 — Supabase Storage signed URLs fail inside edge functions

Signed URLs generated from within Supabase Edge Functions return
`InvalidJWT` errors when used to access Storage.

**Always use the service role client with `.download()` inside edge functions.**

```typescript
// CORRECT — inside edge function
const serviceClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const { data } = await serviceClient.storage
  .from('bucket-name')
  .download(storagePath)

// WRONG — returns InvalidJWT inside edge functions
const { data: { signedUrl } } = await supabase.storage
  .from('bucket-name')
  .createSignedUrl(storagePath, 3600)
```

---

### Rule 7 — Large file base64: use chunked encoding

`btoa(String.fromCharCode(...largeArray))` fails silently for files
larger than approximately 1MB (spread operator stack overflow).

**Always use chunked base64 encoding for audio files and photos.**

```typescript
// CORRECT — chunked encoding
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

// WRONG — fails silently for files > ~1MB
const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
```

---

### Rule 8 — Claude model: never hardcode in edge functions

Claude model strings change. Store as a Supabase secret with a fallback.

```typescript
// CORRECT — in edge function
const model = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-20250514'

// WRONG — hardcoded
const model = 'claude-opus-4-6'
```

The `ANTHROPIC_MODEL` secret is set in the Supabase dashboard.
Default fallback: `claude-sonnet-4-20250514`

---

### Rule 9 — Auth: retry profile fetch after signup

There is a race condition between Supabase signUp() returning and the
auth trigger creating the profile record. fetchProfile() after signUp()
must use a retry with delay.

```typescript
// CORRECT
async function fetchProfileWithRetry(userId: string, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) return data
    if (i < attempts - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  return null
}
```

---

### Rule 10 — Expo Router entry point is mandatory

`app/index.tsx` must exist. Without it the app shows "Unmatched Route"
on launch. This file is always the first file created in a new project.

```typescript
// app/index.tsx — always create this first
import { Redirect } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'

export default function Index() {
  const { session } = useAuth()
  return session
    ? <Redirect href="/(app)" />
    : <Redirect href="/(auth)/welcome" />
}
```

---

### Rule 11 — Photos: compress before upload

Large photos from phone cameras (3–5MB) cause edge function timeouts
when embedded in PDF generation.

**Always compress photos before upload using expo-image-manipulator.**

```typescript
// CORRECT
import * as ImageManipulator from 'expo-image-manipulator'

const compressed = await ImageManipulator.manipulateAsync(
  uri,
  [{ resize: { width: 1200 } }],
  { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
)
// Use compressed.uri for upload and PDF embedding
```

Target: 1200px max width, 0.7 quality JPEG.
expo-image-manipulator is a native module — requires EAS rebuild before use.

---

### Rule 12 — Keyboard covering inputs on Android

Add `softwareKeyboardLayoutMode: "pan"` to app.json to fix the keyboard
covering form fields on Android. This requires a rebuild to take effect.

```json
// app.json
{
  "expo": {
    "android": {
      "softwareKeyboardLayoutMode": "pan"
    }
  }
}
```

---

### Rule 13 — Photos in PDFs: download via service role client

Photos stored in Supabase Storage must be downloaded via the service role
client `.download()` for PDF embedding — the same pattern as Rule 6.
expo-print embeds images as base64 data URIs; external URLs are not loaded
during PDF generation.

```typescript
// Pattern for PDF photo embedding in edge function (if needed)
const { data: blob } = await serviceClient.storage
  .from('photos')
  .download(storagePath)
const arrayBuffer = await blob.arrayBuffer()
const base64 = arrayBufferToBase64(arrayBuffer)  // use chunked fn from Rule 7
const dataUri = `data:image/jpeg;base64,${base64}`
// Use dataUri in HTML template for expo-print
```

---

### Rule 14 — expo-print: images must be base64 data URIs

expo-print does not load external URLs during PDF generation.
All images in PDF HTML templates must be base64 data URIs.

```html
<!-- CORRECT -->
<img src="data:image/jpeg;base64,{base64String}" />

<!-- WRONG — image will not appear in PDF -->
<img src="https://storage.supabase.co/bucket/photo.jpg" />
```

Photos are compressed and converted to base64 on the device before being
passed to the PDF generation function. No network calls during PDF rendering.

---

### Rule 15 — btoa with images: always use chunked conversion

Same as Rule 7 but specifically for photo data. Photos are typically 200–400KB
after compression. The chunked base64 function in Rule 7 must be used for all
photo-to-base64 conversion, not just audio files.

---

## Changelog review policy

Before writing any code involving an Expo or React Native
package — especially a package not previously used in this
project — fetch and read the package changelog:

https://github.com/expo/expo/blob/main/packages/{package-name}/CHANGELOG.md

Replace {package-name} with the exact package folder name,
for example:
- expo-audio → expo-audio
- expo-file-system → expo-file-system
- expo-print → expo-print
- expo-image-manipulator → expo-image-manipulator

Check specifically for:
1. Breaking changes in SDK 56
2. Deprecated APIs replaced by new patterns
3. New recommended usage patterns
4. Known bugs or workarounds

If the changelog contradicts any pattern documented in this
CLAUDE.md file, follow the changelog, note the discrepancy
in task output, and update CLAUDE.md accordingly.

For React Native core changes (not Expo packages), check:
https://reactnative.dev/blog

This review is:
- MANDATORY for any newly installed package
- MANDATORY for any package not yet used in this project
- RECOMMENDED for packages already proven and documented
  in this CLAUDE.md (expo-audio, expo-file-system etc.)

Also fetch and read the Expo SDK 56 release notes before
any task that touches app.json, eas.json, or the build
configuration:
https://expo.dev/changelog/sdk-56

---

## RoomMark-specific rules

These rules are specific to RoomMark's architecture and do not apply to
VoiceReport.

---

### RoomMark Rule 1 — Three-column model is mandatory

Every room item must store three separate boolean fields.
A single condition rating is NOT legally compliant for Australian
condition reports.

```typescript
// CORRECT — database schema
interface RoomItem {
  item_key: string
  item_label: string
  is_prescribed: boolean
  clean: boolean | null
  undamaged: boolean | null
  working: boolean | null      // null = not applicable
  notes: string | null
  flagged: boolean
}

// WRONG — insufficient for legal compliance
interface RoomItem {
  condition: 'good' | 'fair' | 'poor' | 'na'
}
```

---

### RoomMark Rule 2 — Prescribed items cannot be deleted

WA Form 1 states explicitly: "Users can add additional detail but cannot
remove items." The `is_prescribed` field controls this.

```typescript
// UI rule: never render a delete button for prescribed items
// Only render delete for items where is_prescribed === false
{!item.is_prescribed && (
  <DeleteButton onPress={() => deleteItem(item.id)} />
)}
```

---

### RoomMark Rule 3 — Voice recordings: concatenate before Whisper

Multiple recordings per room are concatenated before sending to Whisper.
The edge function receives a single transcript per room.

On the client: maintain an array of audio URIs per room session.
Before sending to the edge function, concatenate the audio files in order.
Send one base64 audio payload per room, not one per recording.

---

### RoomMark Rule 4 — Offline queue pattern

When the device has no connectivity, audio recordings are saved to a queue
in AsyncStorage. A background listener checks connectivity and processes
the queue when online.

```typescript
// Queue item structure
interface QueuedRecording {
  id: string
  room_id: string
  inspection_id: string
  audio_uri: string
  room_context: RoomContext
  queued_at: string
  status: 'queued' | 'processing' | 'failed'
}
```

Never block the inspector from recording because of connectivity.
Show a "Queued — waiting for connection" badge on unprocessed rooms.

---

### RoomMark Rule 5 — State-specific item lists

Room item lists vary by Australian state. The `roomItems.ts` constants file
is the single source of truth. Always reference it, never hardcode items.

```typescript
// lib/roomItems.ts
import { WA_ROOM_ITEMS } from '@/constants/roomTemplates'

export function getPrescribedItems(state: string, roomType: string) {
  const stateItems = STATE_ROOM_ITEMS[state]
  if (!stateItems) throw new Error(`No items defined for state: ${state}`)
  return stateItems[roomType] ?? []
}
```

WA is the only state implemented in MVP. Adding NSW/VIC/QLD means adding
to `roomTemplates.ts` — no other code changes required.

---

### RoomMark Rule 6 — Outgoing inspections require linked ingoing

When creating an outgoing inspection, always check for an existing ingoing
inspection for the same property. Warn if none found. Store the link in
`inspections.ingoing_id`.

```typescript
// Check for existing ingoing before creating outgoing
const { data: existing } = await supabase
  .from('inspections')
  .select('id, inspection_date')
  .eq('property_id', propertyId)
  .eq('inspection_type', 'ingoing')
  .order('inspection_date', { ascending: false })
  .limit(1)
  .single()

if (!existing) {
  // Show warning: "No ingoing report found. Bond claims may be limited."
}
```

---

### RoomMark Rule 7 — PDF generation is local only

PDF generation uses expo-print on the device. No server-side PDF generation.
The HTML template is constructed client-side from inspection data.

PDF templates are stored in `lib/pdfTemplates/` as TypeScript functions
that accept inspection data and return an HTML string.

```typescript
// lib/pdfTemplates/wa-ingoing.ts
export function generateWAIngoingHTML(inspection: InspectionWithRooms): string {
  // Returns complete HTML string for expo-print
}
```

One template function per report type per state.

---

### RoomMark Rule 8 — AI disclaimer is mandatory on all PDFs

This text must appear on every generated PDF. It cannot be removed by
any setting or user preference.

```
This report was prepared using AI-assisted documentation (RoomMark).
All observations were made by and remain the responsibility of the
inspecting agent/landlord named above.
```

This is both a legal requirement (transparency) and an ethical requirement.

---

### RoomMark Rule 9 — Claude prompt context injection

The edge function must inject all required context into the Claude prompt.
Missing context produces incorrect JSON structure.

Required injected values for every room observation call:
- `state` — e.g. "WA"
- `report_type` — "ingoing" | "routine" | "outgoing"
- `room_name` — e.g. "Master Bedroom"
- `room_type` — "bedroom" | "kitchen" | "bathroom" | "living" |
  "dining" | "laundry" | "garage" | "outdoor" | "other"
- `prescribed_items_list` — formatted list of item keys and labels
- `address` — property address
- `date` — inspection date

---

### RoomMark Rule 10 — JSON parse failure handling

Claude's response must be parsed as JSON. Parse failures must be handled
gracefully — never crash the inspection session.

```typescript
// Edge function response handling
try {
  const parsed = JSON.parse(claudeResponseText)
  return new Response(JSON.stringify(parsed), { status: 200 })
} catch (e) {
  // Return parse failure with raw transcript so app can show manual entry
  return new Response(JSON.stringify({
    error: 'parse_failed',
    raw_transcript: whisperTranscript,
    raw_response: claudeResponseText
  }), { status: 200 })  // 200, not 500 — app handles gracefully
}
```

On the client: if `error: 'parse_failed'` is received, show the raw
transcript and allow manual item entry. Never lose the inspector's work.

---

## Build commands

```bash
# Start development server
npx expo start

# EAS build — Android (development build)
eas build --platform android --profile development

# EAS build — Android (preview/testing APK)
eas build --platform android --profile preview

# EAS build — iOS (when Apple account is active)
eas build --platform ios --profile development

# Submit to Google Play
eas submit --platform android

# Supabase edge functions — deploy
supabase functions deploy process-room-observation

# Supabase edge functions — test locally
supabase functions serve process-room-observation
```

---

## Environment setup

**Supabase secrets (set in dashboard, not in code):**
```
OPENAI_API_KEY
ANTHROPIC_API_KEY
ANTHROPIC_MODEL     default: claude-sonnet-4-20250514
```

**Local .env (for Supabase client in app — safe to commit .env.example):**
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Never commit actual keys. Never hardcode keys in source files.

---

## EAS build profiles (eas.json)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

---

## TypeScript strict mode requirements

tsconfig.json must include:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

Do not disable strict mode to resolve type errors. Fix the types.

---

## EAS Build lessons

These lessons were learned from the first EAS build attempt. Each one
prevents a build failure or runtime crash.

### Lesson 1 — First build surfaces dependency conflicts npm install doesn't catch
EAS uses `npm ci` which is stricter than `npm install` locally. `npm ci`
requires an exact match against `package-lock.json` and rejects any
peer dependency conflict with a non-zero exit code. Always check for peer
dependency warnings after `npm install` locally before triggering a build.

### Lesson 2 — React version must exactly match react-native-renderer
React Native 0.85.3 (Expo SDK 56) compiles `react-native-renderer@19.2.3`
into the native APK. If the JS bundle uses a different react version,
the two renderers diverge and the app crashes at runtime with:
`"react" (X.Y.Z) and "react-native-renderer" (19.2.3) must be identical`.
Never bump react independently of the Expo SDK version.

### Lesson 3 — .npmrc legacy-peer-deps suppresses react-dom conflicts
react-dom peer conflicts come from expo-router's web-target
dependencies. These are suppressed via `.npmrc` with
`legacy-peer-deps=true`. This file must be committed to the repo
so EAS Build picks it up. It is safe for a mobile-only app because
react-dom is never executed on device — it is only pulled in
transitively by web-only UI components in expo-router.

### Lesson 4 — npm overrides break react-native-renderer matching
`package.json` `"overrides"` forces all nested dependencies to use a
single version of a package. Using it to pin `react` to a version that
differs from the one compiled into React Native causes the
react-native-renderer mismatch crash. Never use overrides to resolve
react version conflicts.

### Lesson 5 — Build failure diagnostics start with the Install phase
Build failures in the "Install dependencies" phase are always npm/package
conflicts. Get the full log from the expo.dev dashboard, find the npm
error lines, fix the specific conflict rather than forcing resolution
with `--force` or `--legacy-peer-deps` flags in the build command.
The `.npmrc` approach persists across all builds; CLI flags do not.

### Lesson 6 — Android permissions must be declared in app.json
Android permissions must be declared in `app.json` before native features
will work on device. Required permissions for RoomMark:
- `android.permission.RECORD_AUDIO` (expo-audio)
- `android.permission.CAMERA` (expo-image-picker)
- `android.permission.READ_EXTERNAL_STORAGE` (photo library)
- `android.permission.WRITE_EXTERNAL_STORAGE` (photo library)
iOS equivalents go in `app.json` `ios.infoPlist` with usage description
strings. Both require an EAS rebuild to take effect.

### Lesson 7 — Expo Router auto-registers directories as screens
Expo Router auto-registers any subdirectory as a screen. Never add an
explicit `<Stack.Screen name="[id]" />` with a name that matches a
subdirectory name — it creates a duplicate screen crash. Only add
explicit `Screen` entries for `.tsx` files that need custom header options.

---

## Patterns established in build

### 1. Multi-step wizard pattern
- Single screen with internal step state (`useState<number>`)
- Not separate routes — avoids back-button complexity
- Step indicator shown at top (numbered dots with connecting lines)
- Each step validates before enabling the Next button
- Back button decrements step (step 1 → router.back())

### 2. Inspection creation sequence
- Insert inspection first, get inspection ID from returned row
- Then insert all rooms using `DEFAULT_ROOMS_BY_PROPERTY(bedrooms, bathrooms)`
- Then insert all room_items using `getPrescribedItems(state, room_type)`
- All three inserts must succeed or show error (no partial creation)
- Use `router.replace()` (not push) to navigate to rooms screen so back button does not return to the wizard

### 3. Nested dynamic routes
- Pattern: `app/(app)/inspection/[id]/_layout.tsx` contains a Stack for inspection sub-screens
- Room screen: `app/(app)/inspection/[id]/room/[roomId].tsx`
- Access params with `useLocalSearchParams()` typed as `{ id: string }` or `{ id: string; roomId: string }`
- Each sub-route directory needs its own `_layout.tsx` for Expo Router to recognise the nested routes

### 4. Date picker without native modules
- Use Modal with three ScrollView pickers (day / month / year)
- Do not use `@react-native-community/datetimepicker` (native module, requires rebuild)
- Custom JS-only date picker is sufficient for MVP
- Clamp days to valid range for the selected month/year on confirm

### 5. Audio recording pattern
- Hook: `useAudioRecorder` from `expo-audio`
- Multiple recordings supported: stored as URI array in component state
- For MVP: send most recent recording only (concatenation is future enhancement)
- Read file with: `import { File } from 'expo-file-system'` — `const file = new File(uri); const base64 = await file.base64()`
- Always use chunked base64 (`arrayBufferToBase64` in `lib/edgeFunction.ts`) — CLAUDE.md Rule 7
- **expo-audio is a native module — requires EAS rebuild before recording works on device**
- **expo-file-system File class is a native module — requires EAS rebuild before it works on device**

### 6. Edge function call pattern
- All edge function calls go through `lib/edgeFunction.ts`
- Always include `Authorization: Bearer {session.access_token}`
- URL: `EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/{function-name}'`
- Always return status 200 even on AI errors — use `error` field in response body for error handling (CLAUDE.md RoomMark Rule 10)
- Never crash inspection session on AI failure — show transcript, allow manual entry

### 7. Optimistic UI pattern for item toggles
- Update local state immediately on user input
- Debounce Supabase save 800ms (per-item timers in a Map ref)
- On save error: revert local state by reloading from Supabase

### 8. Photo upload pattern (pending rebuild)
- `expo-image-picker`: native module (not yet installed)
- `expo-image-manipulator`: native module (installed, requires EAS rebuild)
- Compress to 1200px / 0.7 quality before upload
- Upload path: `{user_id}/{inspection_id}/{room_id}/{timestamp}.jpg`
- Use `base64-arraybuffer` `decode()` for upload (CLAUDE.md Rule 4)
- Insert to `room_photos` table after successful upload
- Photo capture shows placeholder Alert until after EAS rebuild

### 9. React version management
- Keep react at exactly the version shipped with React Native in the Expo SDK (19.2.3 for SDK 56) — never bump it independently
- react-dom peer conflicts from expo-router web dependencies are suppressed via `.npmrc` with `legacy-peer-deps=true`
- `.npmrc` must be committed to the repo so EAS Build uses it
- Never use `package.json` "overrides" to resolve react version conflicts — it breaks react-native-renderer version matching which must be identical to react

### 10. Keyboard handling pattern
- Always wrap form screens in `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`
- Always use `ScrollView` with `keyboardShouldPersistTaps="handled"` and `contentContainerStyle={{ flexGrow: 1 }}`
- Always place submit buttons inside the `ScrollView` — not outside it — so they scroll above the keyboard
- `softwareKeyboardLayoutMode: "pan"` in `app.json` is a system-level fix applied after EAS rebuild, but `KeyboardAvoidingView` is still required for dev builds and all environments

---

## Task execution rules

When given a task:

1. **Read CLAUDE.md first** — check if the task involves anything covered
   by the rules above before writing any code.

2. **Check for native modules** — if the task involves a new package,
   check for android/ and ios/ folders before importing.

3. **One task at a time** — complete the assigned task fully before
   suggesting or starting the next one.

4. **Report what was done** — after completing a task, list the files
   created or modified and any decisions made that the developer should
   know about.

5. **Flag rebuild requirements** — if any change requires an EAS rebuild
   (new native module, app.json change), state this explicitly at the end
   of the task output.

6. **Never delete existing functionality** — RoomMark will be built
   incrementally. New tasks must not break screens or features already
   built and approved.

---

## Current build status

**Status:** Inspection flow complete. Room assessment with AI pipeline built.

- Expo SDK 56.0.8 with TypeScript 6.0.3 strict mode
- Expo Router: Tabs + Stack + nested dynamic routes
- Supabase client connected to project `uhvxizhmakkmejktwann`
- All 8 tables with RLS ✅
- Auth flow ✅ | Dashboard ✅ | Properties ✅
- WA room templates: 10 types, 108 items ✅
- Inspection wizard + room list hub ✅
- Room assessment: RECORDING + REVIEW states, C/U/W toggles, AI pipeline ✅
- Edge function: process-room-observation (Whisper + Claude) created, not deployed
- ⚠️ EAS rebuild required: expo-audio, expo-file-system, expo-image-manipulator installed but not usable until rebuild

Next tasks:
1. ~~Set up Supabase project~~ ✅
2. ~~Database schema migration~~ ✅
3. ~~Auth flow~~ ✅
4. ~~Properties CRUD~~ ✅
5. ~~WA room item templates~~ ✅
6. ~~Inspection wizard + room list~~ ✅
7. ~~Room assessment + edge function~~ ✅
8. EAS build (required to activate native modules)
9. Edge function deployment + testing
10. PDF generation (expo-print templates)

Check PROJECT_BRIEF.md for full scope and folder structure.
