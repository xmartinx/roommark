// ============================================================================
// RoomMark — WA Form 1 prescribed room item definitions
// Single source of truth for all state-specific room item templates.
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoomItemTemplate {
  key: string;
  label: string;
  hasWorking: boolean;
}

export interface RoomDefinition {
  room_name: string;
  room_type: string;
  room_order: number;
}

// ---------------------------------------------------------------------------
// Individual item lists by room type
// ---------------------------------------------------------------------------

const ENTRY_ITEMS: RoomItemTemplate[] = [
  { key: 'front_door',          label: 'Front Door / Lock / Handle',  hasWorking: true  },
  { key: 'screen_door',         label: 'Screen / Security Door',       hasWorking: true  },
  { key: 'walls_ceiling',       label: 'Walls / Ceiling / Cornices',    hasWorking: false },
  { key: 'light_fittings',      label: 'Light Fittings',               hasWorking: true  },
  { key: 'power_points',        label: 'Power Points',                 hasWorking: true  },
  { key: 'windows_screens',     label: 'Windows / Flyscreens',         hasWorking: true  },
  { key: 'blinds_curtains',     label: 'Blinds / Curtains',            hasWorking: true  },
  { key: 'floor_coverings',     label: 'Floor Coverings',              hasWorking: false },
  { key: 'skirting_boards',     label: 'Skirting Boards',              hasWorking: false },
];

const LIVING_ITEMS: RoomItemTemplate[] = [
  { key: 'walls_ceiling',       label: 'Walls / Ceiling / Cornices',    hasWorking: false },
  { key: 'light_fittings',      label: 'Light Fittings',               hasWorking: true  },
  { key: 'power_points',        label: 'Power Points',                 hasWorking: true  },
  { key: 'windows_screens',     label: 'Windows / Flyscreens',         hasWorking: true  },
  { key: 'blinds_curtains',     label: 'Blinds / Curtains',            hasWorking: true  },
  { key: 'floor_coverings',     label: 'Floor Coverings',              hasWorking: false },
  { key: 'skirting_boards',     label: 'Skirting Boards',              hasWorking: false },
  { key: 'ceiling_fan',         label: 'Ceiling Fan',                  hasWorking: true  },
  { key: 'air_conditioner',     label: 'Air Conditioner',              hasWorking: true  },
];

// Dining: same items as living
const DINING_ITEMS: RoomItemTemplate[] = LIVING_ITEMS;

const KITCHEN_ITEMS: RoomItemTemplate[] = [
  { key: 'walls_ceiling',       label: 'Walls / Ceiling / Cornices',    hasWorking: false },
  { key: 'light_fittings',      label: 'Light Fittings',               hasWorking: true  },
  { key: 'power_points',        label: 'Power Points',                 hasWorking: true  },
  { key: 'windows_screens',     label: 'Windows / Flyscreens',         hasWorking: true  },
  { key: 'blinds_curtains',     label: 'Blinds / Curtains',            hasWorking: true  },
  { key: 'floor_coverings',     label: 'Floor Coverings',              hasWorking: false },
  { key: 'bench_tops',          label: 'Bench Tops / Splashback',      hasWorking: false },
  { key: 'cupboards_drawers',   label: 'Cupboards / Drawers',          hasWorking: true  },
  { key: 'sink_tapware',        label: 'Sink / Tapware',               hasWorking: true  },
  { key: 'oven_griller',        label: 'Oven / Griller',               hasWorking: true  },
  { key: 'cooktop',             label: 'Hotplates / Cooktop',          hasWorking: true  },
  { key: 'rangehood',           label: 'Rangehood / Exhaust Fan',      hasWorking: true  },
  { key: 'dishwasher',          label: 'Dishwasher',                   hasWorking: true  },
  { key: 'fridge_recess',       label: 'Fridge Recess',                hasWorking: false },
  { key: 'pantry',              label: 'Pantry',                       hasWorking: false },
];

const BEDROOM_ITEMS: RoomItemTemplate[] = [
  { key: 'walls_ceiling',       label: 'Walls / Ceiling / Cornices',    hasWorking: false },
  { key: 'light_fittings',      label: 'Light Fittings',               hasWorking: true  },
  { key: 'power_points',        label: 'Power Points',                 hasWorking: true  },
  { key: 'windows_screens',     label: 'Windows / Flyscreens',         hasWorking: true  },
  { key: 'blinds_curtains',     label: 'Blinds / Curtains',            hasWorking: true  },
  { key: 'floor_coverings',     label: 'Floor Coverings',              hasWorking: false },
  { key: 'skirting_boards',     label: 'Skirting Boards',              hasWorking: false },
  { key: 'built_in_wardrobe',   label: 'Built-in Wardrobe',            hasWorking: true  },
  { key: 'ceiling_fan',         label: 'Ceiling Fan',                  hasWorking: true  },
  { key: 'air_conditioner',     label: 'Air Conditioner',              hasWorking: true  },
  { key: 'door_lock',           label: 'Door / Lock / Handle',         hasWorking: true  },
];

const BATHROOM_ITEMS: RoomItemTemplate[] = [
  { key: 'walls_ceiling_tiles', label: 'Walls / Ceiling / Tiles',       hasWorking: false },
  { key: 'light_fittings',      label: 'Light Fittings',               hasWorking: true  },
  { key: 'exhaust_fan',         label: 'Exhaust Fan',                  hasWorking: true  },
  { key: 'windows_screens',     label: 'Windows / Flyscreens',         hasWorking: true  },
  { key: 'floor_coverings',     label: 'Floor Coverings / Tiles',      hasWorking: false },
  { key: 'vanity_basin',        label: 'Vanity / Basin / Tapware',     hasWorking: true  },
  { key: 'mirror_cabinet',      label: 'Mirror / Cabinet',             hasWorking: false },
  { key: 'shower_screen',       label: 'Shower / Shower Screen',       hasWorking: true  },
  { key: 'bath',                label: 'Bath',                         hasWorking: false },
  { key: 'toilet',              label: 'Toilet / Cistern / Seat',      hasWorking: true  },
  { key: 'towel_rails',         label: 'Towel Rails / Accessories',    hasWorking: false },
  { key: 'shaver_point',        label: 'Shaver Point',                 hasWorking: true  },
];

const LAUNDRY_ITEMS: RoomItemTemplate[] = [
  { key: 'walls_ceiling',       label: 'Walls / Ceiling',              hasWorking: false },
  { key: 'light_fittings',      label: 'Light Fittings',               hasWorking: true  },
  { key: 'power_points',        label: 'Power Points',                 hasWorking: true  },
  { key: 'windows_screens',     label: 'Windows / Flyscreens',         hasWorking: true  },
  { key: 'floor_coverings',     label: 'Floor Coverings',              hasWorking: false },
  { key: 'tub_sink',            label: 'Tub / Sink / Tapware',         hasWorking: true  },
  { key: 'cupboards',           label: 'Cupboards / Shelving',         hasWorking: false },
  { key: 'washing_machine_connections', label: 'Washing Machine Connections', hasWorking: true },
  { key: 'dryer_connections',   label: 'Dryer Connections / Venting',  hasWorking: true  },
];

const GARAGE_ITEMS: RoomItemTemplate[] = [
  { key: 'floor',               label: 'Floor',                        hasWorking: false },
  { key: 'walls_ceiling',       label: 'Walls / Ceiling',              hasWorking: false },
  { key: 'lighting',            label: 'Lighting',                     hasWorking: true  },
  { key: 'garage_door',         label: 'Garage Door / Remote / Motor', hasWorking: true  },
  { key: 'internal_door',       label: 'Internal Access Door',         hasWorking: true  },
  { key: 'storage',             label: 'Storage / Shelving',           hasWorking: false },
];

const OUTDOOR_ITEMS: RoomItemTemplate[] = [
  { key: 'front_garden',        label: 'Front Garden / Lawn',          hasWorking: false },
  { key: 'rear_garden',         label: 'Rear Garden / Lawn',           hasWorking: false },
  { key: 'paths_driveway',      label: 'Paths / Driveway / Paving',    hasWorking: false },
  { key: 'fencing_gates',       label: 'Fencing / Gates',              hasWorking: false },
  { key: 'letterbox',           label: 'Letterbox',                    hasWorking: false },
  { key: 'external_taps',       label: 'External Taps',                hasWorking: true  },
  { key: 'clothesline',         label: 'Clothesline',                  hasWorking: true  },
  { key: 'shed',                label: 'Shed / Outbuilding',           hasWorking: false },
  { key: 'external_lighting',   label: 'External Lighting',            hasWorking: true  },
  { key: 'bins',                label: 'Rubbish Bins',                 hasWorking: false },
];

// ---------------------------------------------------------------------------
// WA room items — keyed by room_type
// ---------------------------------------------------------------------------

export const WA_ROOM_ITEMS: Record<string, RoomItemTemplate[]> = {
  entry:    ENTRY_ITEMS,
  living:   LIVING_ITEMS,
  dining:   DINING_ITEMS,
  kitchen:  KITCHEN_ITEMS,
  bedroom:  BEDROOM_ITEMS,
  bathroom: BATHROOM_ITEMS,
  laundry:  LAUNDRY_ITEMS,
  garage:   GARAGE_ITEMS,
  outdoor:  OUTDOOR_ITEMS,
};

// ---------------------------------------------------------------------------
// DEFAULT_ROOMS_BY_PROPERTY
//
// Returns an ordered array of room definitions for a new inspection.
// Order: Entry → Living → Dining (3+ BR) → Kitchen → Bedrooms → Bathrooms →
//        Laundry → Garage → Outdoor
// ---------------------------------------------------------------------------

export function DEFAULT_ROOMS_BY_PROPERTY(
  bedrooms: number,
  bathrooms: number,
): RoomDefinition[] {
  const rooms: RoomDefinition[] = [];
  let order = 1;

  // Entry
  rooms.push({ room_name: 'Entry', room_type: 'entry', room_order: order++ });

  // Living Room
  rooms.push({ room_name: 'Living Room', room_type: 'living', room_order: order++ });

  // Dining Room — only for 3+ bedroom properties
  if (bedrooms >= 3) {
    rooms.push({ room_name: 'Dining Room', room_type: 'dining', room_order: order++ });
  }

  // Kitchen
  rooms.push({ room_name: 'Kitchen', room_type: 'kitchen', room_order: order++ });

  // Bedrooms
  for (let i = 1; i <= bedrooms; i++) {
    rooms.push({
      room_name: `Bedroom ${i}`,
      room_type: 'bedroom',
      room_order: order++,
    });
  }

  // Bathrooms
  for (let i = 1; i <= bathrooms; i++) {
    rooms.push({
      room_name: `Bathroom ${i}`,
      room_type: 'bathroom',
      room_order: order++,
    });
  }

  // Laundry
  rooms.push({ room_name: 'Laundry', room_type: 'laundry', room_order: order++ });

  // Garage
  rooms.push({ room_name: 'Garage', room_type: 'garage', room_order: order++ });

  // Outdoor Areas
  rooms.push({ room_name: 'Outdoor Areas', room_type: 'outdoor', room_order: order++ });

  return rooms;
}

// ---------------------------------------------------------------------------
// getPrescribedItems
//
// Returns the prescribed item list for a given state and room type.
// MVP: only 'WA' is implemented. Throws for unsupported states.
// Returns empty array for unknown room types (custom rooms).
// ---------------------------------------------------------------------------

const STATE_ROOM_ITEMS: Record<string, Record<string, RoomItemTemplate[]>> = {
  WA: WA_ROOM_ITEMS,
};

export function getPrescribedItems(
  state: string,
  roomType: string,
): RoomItemTemplate[] {
  const stateItems = STATE_ROOM_ITEMS[state];
  if (!stateItems) {
    throw new Error(`No room item templates defined for state: ${state}`);
  }
  return stateItems[roomType] ?? [];
}
