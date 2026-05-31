// WA Form 1 prescribed room items.
// Single source of truth for all state-specific room item definitions.

export interface RoomItemDefinition {
  key: string;
  label: string;
  appliesTo: string[]; // room types this item applies to
}

// Placeholder — WA Form 1 items will be populated in a future task
export const WA_ROOM_ITEMS: Record<string, RoomItemDefinition[]> = {};

// NSW, VIC, QLD templates added post-MVP
