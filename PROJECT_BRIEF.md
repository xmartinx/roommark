# RoomMark — Project Brief

**Version:** 1.0  
**Date:** May 2026  
**Status:** Pre-build planning complete. Build not yet started.  
**Project root:** `D:\Appbuilds\RoomMark`

---

## What RoomMark is

RoomMark is an AI-powered rental property inspection report generator for
Australian property managers and landlords. The inspector walks through a
property speaking observations room by room. RoomMark transcribes the voice
input, structures it into a legally compliant condition report using Claude AI,
and generates a PDF ready to sign and send — in under 3 minutes per inspection.

The product name is **RoomMark**. The app icon and branding use camelCase:
**RoomMark**. The domain is `roommark.com.au`.

---

## The problem being solved

A property manager conducting 10–30 inspections per month spends 20–45 minutes
writing up each report manually. That is up to 22 hours per month on paperwork.
Existing tools either require typing everything manually, cost more than $50/month,
hide pricing behind sales calls, or require hardware (360° cameras). None use
voice as the primary input method.

RoomMark's core differentiator: **voice-first, AI-structured, legally compliant,
transparently priced under $25/month.**

---

## Target users

**Primary:** Property managers at real estate agencies (highest volume, most
willing to pay). Managing 50–200 properties each. Conducting 10–30 inspections
per month. Time is their most constrained resource.

**Secondary:** Independent landlords with 2–20 properties. Less frequent
inspections but still benefit from professional documentation.

**Tertiary:** Building managers, strata inspectors.

**Geography:** Australia-wide. WA is the priority market (developer is
Albany-based, WA templates built first).

---

## Revenue model

- **Free tier:** 3 inspection reports per month. No credit card required.
  PDF has RoomMark branding. All state templates available. Full feature access
  except AI descriptions, entry/exit comparison, and agency branding.
- **Pro:** ~$22 AUD/month (exact price TBC before launch). Unlimited reports,
  AI voice input, unlimited photos, agency-branded PDFs, entry/exit comparison,
  full property history.
- **Agency:** ~$15/inspector/month for 3+ inspectors. Team accounts,
  role-based permissions, priority support.
- **Annual discount:** 2 months free on annual plans.
- **Beta period:** Free for all users. Paid tiers activate at public launch.

Target MRR milestones:
- 50 users = ~$1,100/month — proof of concept
- 200 users = ~$4,400/month — viable income
- 500 users = ~$11,000/month — strong business

---

## Sister app — VoiceReport

RoomMark shares its entire technical architecture with VoiceReport, an app
already built and in testing. VoiceReport is a voice-to-report tool for
tradespeople. RoomMark is the property inspection variant.

**The entire VoiceReport technical stack, pipeline, and hard-won lessons apply
directly to RoomMark. Do not reinvent anything VoiceReport already solved.**

See the CLAUDE.md file for the complete list of VoiceReport lessons that must
not be repeated.

---

## Technical stack

Identical to VoiceReport:

- **Framework:** React Native / Expo SDK 56 (TypeScript strict mode)
- **Routing:** Expo Router (file-based)
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Transcription:** OpenAI Whisper API (via Supabase Edge Function)
- **AI structuring:** Anthropic Claude API (via Supabase Edge Function)
- **Audio recording:** expo-audio (NOT expo-av — crashes on Android SDK 56)
- **PDF generation:** expo-print (local, no server required)
- **File sharing:** expo-sharing
- **File system:** expo-file-system File class (NOT legacy readAsStringAsync)
- **Storage uploads:** base64-arraybuffer + decode() pattern
- **Subscriptions:** RevenueCat (not yet implemented — activate at launch)
- **Builds:** EAS Build (cloud Android + iOS — no local Mac required)

**Platform priority:** Android first (developer has Android devices and active
Google Play account). iOS added when Apple Developer account is activated and
iPhone test device is available. Apple Developer account not yet active as of
project start.

---

## Key architectural differences from VoiceReport

RoomMark is more complex than VoiceReport in these specific ways:

1. **Room-by-room data model.** The report is a collection of room assessments,
   not a single document. Each room has multiple assessed items with three
   boolean fields each (clean/undamaged/working).

2. **Three-column condition model.** Every item must store `clean` (boolean),
   `undamaged` (boolean), and `working` (boolean/null) separately. A single
   condition rating is insufficient for legal compliance.

3. **Property records.** Inspections belong to properties. Properties have
   landlord and tenant contact details. Richer data model than VoiceReport.

4. **Multiple recordings per room.** Inspector can record multiple times per
   room. All recordings are concatenated before sending to Whisper. Single
   transcript sent to Claude.

5. **State-specific templates.** WA built first. NSW, VIC, QLD to follow.
   Template selection is automatic based on the property's state.

6. **Entry/exit comparison.** Outgoing reports are linked to ingoing reports
   and render a side-by-side comparison. Items showing deterioration are
   automatically flagged.

7. **Offline queue.** Voice recordings are saved to device when offline.
   Processed automatically when connectivity returns.

8. **Prescribed vs custom items.** WA Form 1 items cannot be deleted — only
   marked N/A. Custom items can be added freely.

9. **VIC-specific:** Entry and exit are two parts of the same document.
   Outgoing inspection must reference and embed the original ingoing data.

10. **QLD-specific:** Exit condition report is prepared by the tenant, not the
    agent. The app must support this inverted workflow.

---

## Database schema

```sql
-- User profiles (extends Supabase auth.users)
profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users,
  full_name       text NOT NULL,
  agency_name     text,
  phone           text,
  email           text,
  default_state   text NOT NULL DEFAULT 'WA',
  logo_url        text,
  created_at      timestamptz DEFAULT now()
)

-- Properties
properties (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE,
  address         text NOT NULL,
  suburb          text NOT NULL,
  state           text NOT NULL,
  postcode        text NOT NULL,
  property_type   text,         -- 'house'|'unit'|'townhouse'|'other'
  bedrooms        integer,
  bathrooms       integer,
  landlord_name   text,
  landlord_email  text,
  landlord_phone  text,
  tenant_name     text,
  tenant_email    text,
  tenant_phone    text,
  created_at      timestamptz DEFAULT now()
)

-- Inspections
inspections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES profiles(id) ON DELETE CASCADE,
  property_id         uuid REFERENCES properties(id) ON DELETE CASCADE,
  inspection_type     text NOT NULL,  -- 'ingoing'|'routine'|'outgoing'
  state               text NOT NULL,
  status              text NOT NULL DEFAULT 'draft',
                                      -- 'draft'|'complete'|'sent'
  inspector_name      text NOT NULL,
  inspection_date     date NOT NULL,
  inspection_time     time,
  ingoing_id          uuid REFERENCES inspections(id),
                                      -- for outgoing: links to ingoing
  keys_issued         integer,
  keys_returned       integer,
  water_meter         text,
  gas_meter           text,
  electricity_meter   text,
  overall_notes       text,
  pdf_url             text,
  sent_at             timestamptz,
  created_at          timestamptz DEFAULT now()
)

-- Rooms
rooms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   uuid REFERENCES inspections(id) ON DELETE CASCADE,
  room_name       text NOT NULL,
  room_type       text NOT NULL,
                  -- 'bedroom'|'kitchen'|'bathroom'|'living'|
                  -- 'dining'|'laundry'|'garage'|'outdoor'|'other'
  room_order      integer NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
                  -- 'pending'|'complete'|'na'
  overall_condition text,            -- 'good'|'fair'|'poor'
  general_notes   text,
  created_at      timestamptz DEFAULT now()
)

-- Room items (individual assessed items within a room)
room_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid REFERENCES rooms(id) ON DELETE CASCADE,
  item_key        text NOT NULL,     -- e.g. 'walls_ceiling', 'floor_coverings'
  item_label      text NOT NULL,     -- e.g. 'Walls / Ceiling'
  is_prescribed   boolean NOT NULL DEFAULT true,
                                     -- prescribed items cannot be deleted
  clean           boolean,
  undamaged       boolean,
  working         boolean,           -- null if not applicable
  notes           text,
  flagged         boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now()
)

-- Room photos (associated with a specific room item or general to a room)
room_photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid REFERENCES rooms(id) ON DELETE CASCADE,
  item_id         uuid REFERENCES room_items(id) ON DELETE SET NULL,
                                     -- null = photo is general to room
  storage_path    text NOT NULL,
  taken_at        timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz DEFAULT now()
)

-- Maintenance items (flagged during inspection)
maintenance_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   uuid REFERENCES inspections(id) ON DELETE CASCADE,
  room_id         uuid REFERENCES rooms(id) ON DELETE CASCADE,
  description     text NOT NULL,
  priority        text NOT NULL,     -- 'low'|'medium'|'urgent'
  responsibility  text NOT NULL,     -- 'tenant'|'landlord'|'unknown'
  resolved        boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now()
)

-- Compliance items (state-specific required fields beyond room items)
compliance_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   uuid REFERENCES inspections(id) ON DELETE CASCADE,
  item_type       text NOT NULL,
                  -- 'smoke_alarm'|'pool_fence'|'minimum_standard'|
                  -- 'safety_switch'|'water_efficiency'|'key'
  label           text NOT NULL,
  value           text,
  compliant       boolean,
  notes           text,
  created_at      timestamptz DEFAULT now()
)
```

---

## Supabase Edge Functions

Two edge functions — identical pattern to VoiceReport:

**`process-room-observation`**
Receives audio (base64), room context, and inspection metadata.
Calls Whisper for transcription, then Claude for structured JSON output.
Returns room assessment JSON to the app.

**`generate-report-pdf`**
Not needed — PDF generation happens locally on device via expo-print.
This function may be added later for server-side PDF generation if needed.

**Environment secrets required:**
```
OPENAI_API_KEY
ANTHROPIC_API_KEY
ANTHROPIC_MODEL    (default: claude-sonnet-4-20250514)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

---

## MVP scope — WA launch

The MVP is a complete, working, legally compliant inspection app for WA only.

**In MVP:**
- Ingoing, Routine, and Outgoing condition reports for WA
- Voice-first room assessment with AI structuring
- Full WA Form 1 room and item list
- Three-column condition model (clean/undamaged/working)
- Multiple photos per room item
- PDF generation (expo-print) matching WA Form 1 layout
- Entry/exit comparison for outgoing reports
- Offline queue for voice recordings
- Property and inspection history
- Basic profile and agency branding
- Free tier (3 reports/month) enforced client-side
- RevenueCat integration scaffolded but paywall inactive during beta

**Post-MVP (do not build yet):**
- NSW, VIC, QLD templates
- Digital signatures (expo-signature-canvas — native module, requires rebuild)
- Tenant-facing portal
- PropertyMe / PropertyTree API integration
- iOS release (pending Apple Developer account)
- Team / agency accounts
- Push notifications for inspection reminders

---

## Legal requirements summary

**WA (MVP):**
- Prescribed form: Form 1, Residential Tenancies Act 1987 s.27C(6)
- Ingoing: 2 copies to tenant within 7 days of moving in. $5,000 penalty for failure.
- Outgoing: within 14 days of tenancy end. $5,000 penalty for failure.
- Three-column model: Clean Y/N, Undamaged Y/N, Working Y/N per item
- Prescribed items cannot be removed (only N/A)
- Custom items can be added
- Photos recommended but not a substitute for written descriptions
- Tenant has 7 days to return signed copy; failure = deemed acceptance

**All reports must include:**
```
AI ASSISTANCE DISCLAIMER
This report was prepared using AI-assisted documentation (RoomMark).
All observations were made by and remain the responsibility of the
inspecting agent/landlord named above.
```
This disclaimer cannot be removed. It is a legal and ethical requirement.

---

## Competitive context

**Closest competitor:** ConditionHQ (conditionhq.app) — launched late 2025.
Photo-based AI (not voice). Free tier: 3 reports/month. Pro: $59/month.
All 8 states. Web app, not native mobile.

**RoomMark's differentiation:**
- Voice-first (ConditionHQ is photo-only)
- Native mobile app (ConditionHQ is web)
- Meaningfully cheaper at Pro tier (~$22 vs $59)
- Android-first (most competitors are iOS-first)

**Do not copy ConditionHQ's feature set** — differentiate on voice workflow
and price. The voice-first angle is the product's reason to exist.

---

## Project folder structure

```
D:\Appbuilds\RoomMark\
├── PROJECT_BRIEF.md          ← this file
├── CLAUDE.md                 ← Claude Code instructions
├── app/                      ← Expo Router screens
│   ├── index.tsx             ← entry point (required)
│   ├── (auth)/
│   │   ├── welcome.tsx
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (app)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx         ← dashboard
│   │   ├── properties/
│   │   ├── inspection/
│   │   └── settings/
│   └── _layout.tsx
├── components/               ← shared UI components
├── lib/
│   ├── supabase.ts
│   ├── claude.ts
│   └── roomItems.ts          ← prescribed item lists by state/room type
├── hooks/
├── constants/
│   └── roomTemplates.ts      ← WA room item definitions
├── supabase/
│   ├── functions/
│   │   └── process-room-observation/
│   │       └── index.ts
│   └── migrations/
├── assets/
└── tools/                    ← pipeline scripts (not part of app)
    └── pipeline.py
```

---

## Key contacts and resources

- Consumer Protection WA (Form 1): consumerprotection.wa.gov.au
- WA Residential Tenancies Act 1987: legislation.wa.gov.au
- Supabase dashboard: supabase.com/dashboard
- EAS Build: expo.dev/eas
- RevenueCat: revenuecat.com
- RoomMark domain: roommark.com.au (register before launch)

---

## Build status

Last updated: 2026-06-01

### Complete and functional
- Supabase project: schema, RLS, auth trigger, storage buckets (migrations 001-004)
- Auth flow: welcome, sign-up, profile-setup, sign-in screens
- Dashboard: recent inspections list, Start New Inspection CTA, bottom tab bar
- Properties list: searchable, pull-to-refresh, real Supabase data
- Properties new: full form with all fields, saves to Supabase
- Settings: profile card, sign-out
- WA room templates: 10 room types, 108 prescribed items with hasWorking flags
- Inspection wizard: 3-step (property → type → confirm), date picker, meter readings, keys stepper
- Inspection creation: inserts inspection + rooms + room_items to Supabase in single atomic flow
- Room list hub: progress bar, status icons, N/A confirmation, add custom room, flagged items modal, bottom action bar
- Room assessment screen: RECORDING state (record button, pulse animation, timer, process observations) + REVIEW state (C/U/W toggles, notes editor, flagged resolver, add custom item, debounced saves, condition badge)
- Edge function `process-room-observation`: Whisper transcription + Claude structuring, parse failure recovery (status 200), JWT auth verification — created, not yet deployed
- `lib/edgeFunction.ts`: typed client helper with `processRoomObservation()` and `arrayBufferToBase64()` (Rule 7 chunked encoding)
- Properties detail: full property info card, landlord/tenant contact sections (tappable mailto/tel), inspection history list, Start New Inspection CTA, pull-to-refresh, edit link
- Properties edit: all fields pre-populated, same layout as add form, landlord/tenant optional fields, state picker, chip groups, save + validation

### Stubs awaiting implementation
- Additional items screen — stub
- Report preview screen — stub
- History screen — stub only

### Not yet started
- EAS build (required to activate native modules: expo-audio, expo-file-system, expo-image-manipulator)
- Edge function deployment + live testing
- PDF generation (expo-print templates)
- RevenueCat subscription integration
- AsyncStorage session persistence (needs EAS build first)

### ⚠️ Native modules installed — require EAS rebuild
The following native modules are installed but will not work until after an EAS build:
- `expo-audio` — voice recording (useAudioRecorder)
- `expo-file-system` — File class for base64 reading
- `expo-image-manipulator` — photo compression
- `expo-print` — PDF generation (future task)
- `expo-sharing` — sharing PDFs (future task)

JS-only mode (current): Auth, dashboard, properties, inspection wizard, room list, and room assessment UI all work. Voice recording, file reading, and photo features require EAS rebuild.
