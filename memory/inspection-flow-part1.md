---
name: inspection-flow-part1
description: RoomMark inspection wizard, room templates, room list hub — Part 1 of 2
metadata:
  type: project
---

Inspection flow Part 1 built on 2026-06-01. Covers the new inspection wizard (3-step), WA room item templates (108 prescribed items across 10 room types), and the room list hub with progress tracking.

**Why:** Fifth build milestone — the core inspection creation pipeline is functional. Users can select a property, choose an inspection type, configure details (date, meters, keys), and the system auto-generates rooms and prescribed items from WA Form 1 templates.

**How to apply:**

**WA Templates** (`constants/roomTemplates.ts`):
- 10 room types: entry, living, dining, kitchen, bedroom, bathroom, laundry, garage, outdoor
- 108 prescribed items, each with `hasWorking` flag for the three-column model
- `DEFAULT_ROOMS_BY_PROPERTY(bedrooms, bathrooms)` generates ordered room list
- `getPrescribedItems(state, roomType)` returns items for a room type
- Dining room only included for 3+ bedroom properties

**Wizard** (`app/(app)/inspection/new.tsx`):
- Single screen with internal `useState(step)` — not separate routes
- Step 1: searchable property list, tap to select, "Add New Property" link
- Step 2: three inspection type cards (color-coded borders), ingoing check for outgoing
- Step 3: summary card, tappable date picker (custom modal with day/month/year scroll columns, no native module), keys stepper, meter readings with "Not connected" toggle
- On submit: inserts inspection → inserts rooms → inserts room_items. All must succeed or error shown.
- Uses `router.replace()` to navigate to rooms screen (back button won't return to wizard)

**Room List Hub** (`app/(app)/inspection/[id]/rooms.tsx`):
- Progress bar: "X of Y rooms assessed"
- Status icons: pending (grey circle), complete (green checkmark), N/A (grey dash)
- Colored left borders: green for complete, amber for flagged
- Long press: action sheet (Mark N/A, Rename room, Cancel)
- Add Room modal: bottom sheet with name input + room type chip scroller
- Additional Items card navigates to stub
- Bottom bar: Save Draft + Generate Report (disabled until all rooms assessed)
- Flagged items confirmation modal before generating report

**Key files created/modified:**
- `constants/roomTemplates.ts` — full WA definitions (replaced placeholder)
- `lib/roomItems.ts` — re-exported from templates
- `lib/types.ts` — added Room, RoomItem, RoomWithItems, InspectionWithRooms types
- `app/(app)/inspection/new.tsx` — 3-step wizard (replaced stub)
- `app/(app)/inspection/_layout.tsx` — updated routes
- `app/(app)/inspection/[id]/_layout.tsx` — Stack for sub-routes
- `app/(app)/inspection/[id]/rooms.tsx` — room list hub
- `app/(app)/inspection/[id]/room/[roomId].tsx` — assessment stub
- `app/(app)/inspection/[id]/additional.tsx` — stub
- `app/(app)/inspection/[id]/preview.tsx` — stub
