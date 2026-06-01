// ---------------------------------------------------------------------------
// Shared database row types — mirrors the Supabase schema
// ---------------------------------------------------------------------------

export interface Property {
  id: string;
  user_id: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  landlord_name: string | null;
  landlord_email: string | null;
  landlord_phone: string | null;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  user_id: string;
  property_id: string;
  inspection_type: 'ingoing' | 'routine' | 'outgoing';
  state: string;
  status: 'draft' | 'complete' | 'sent';
  inspector_name: string;
  inspection_date: string;
  inspection_time: string | null;
  ingoing_id: string | null;
  keys_issued: number | null;
  keys_returned: number | null;
  water_meter: string | null;
  gas_meter: string | null;
  electricity_meter: string | null;
  overall_notes: string | null;
  pdf_url: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  inspection_id: string;
  room_name: string;
  room_type: string;
  room_order: number;
  status: 'pending' | 'complete' | 'na';
  overall_condition: 'good' | 'fair' | 'poor' | null;
  general_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomItem {
  id: string;
  room_id: string;
  item_key: string;
  item_label: string;
  is_prescribed: boolean;
  clean: boolean | null;
  undamaged: boolean | null;
  working: boolean | null;
  notes: string | null;
  flagged: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Composite / joined types
// ---------------------------------------------------------------------------

/** Inspection row joined with its parent property */
export interface InspectionWithProperty extends Inspection {
  property: Property | null;
}

/** Room with its items array loaded */
export interface RoomWithItems extends Room {
  items: RoomItem[];
}

/** Inspection with rooms, each with items */
export interface InspectionWithRooms extends Inspection {
  property: Property | null;
  rooms: RoomWithItems[];
}

// ---------------------------------------------------------------------------
// Insert types (omit server-generated fields)
// ---------------------------------------------------------------------------

export type PropertyInsert = Omit<Property, 'id' | 'created_at' | 'updated_at'>;

export type InspectionInsert = Omit<
  Inspection,
  'id' | 'created_at' | 'updated_at'
>;

export type RoomInsert = Omit<Room, 'id' | 'created_at' | 'updated_at'>;

export type RoomItemInsert = Omit<
  RoomItem,
  'id' | 'created_at' | 'updated_at'
>;

// ---------------------------------------------------------------------------
// Room photos
// ---------------------------------------------------------------------------

export interface RoomPhoto {
  id: string;
  room_id: string;
  item_id: string | null;
  storage_path: string;
  taken_at: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Maintenance items
// ---------------------------------------------------------------------------

export interface MaintenanceItem {
  id: string;
  inspection_id: string;
  room_id: string;
  description: string;
  priority: 'low' | 'medium' | 'urgent';
  responsibility: 'tenant' | 'landlord' | 'unknown';
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export type MaintenanceItemInsert = Omit<
  MaintenanceItem,
  'id' | 'created_at' | 'updated_at'
>;

// ---------------------------------------------------------------------------
// AI / Edge Function types
// ---------------------------------------------------------------------------

/** A single item as assessed by Claude */
export interface AssessedItem {
  clean: boolean;
  undamaged: boolean;
  working: boolean | null;
  notes: string;
  flagged: boolean;
}

/** Maintenance item suggested by Claude */
export interface MaintenanceItemSuggestion {
  description: string;
  priority: 'low' | 'medium' | 'urgent';
  responsibility: 'tenant' | 'landlord' | 'unknown';
}

/** The structured assessment returned by the edge function on success */
export interface ClaudeRoomAssessment {
  room_name: string;
  overall_condition: 'good' | 'fair' | 'poor';
  items: Record<string, AssessedItem>;
  maintenance_items: MaintenanceItemSuggestion[];
  general_notes: string | null;
}

/** Request body sent to the edge function */
export interface EdgeFunctionRequest {
  audio_base64: string;
  room_name: string;
  room_type: string;
  state: string;
  report_type: string;
  address: string;
  date: string;
  inspection_id: string;
  room_id: string;
  prescribed_items: Array<{
    key: string;
    label: string;
    hasWorking: boolean;
  }>;
}

/** Success / error union returned by lib/edgeFunction.ts */
export type RoomAssessmentResult =
  | { success: true; assessment: ClaudeRoomAssessment }
  | {
      success: false;
      error: string;
      rawTranscript?: string;
      rawResponse?: string;
    };

// ---------------------------------------------------------------------------
// Offline queue (RoomMark Rule 4)
// ---------------------------------------------------------------------------

export interface QueuedRecording {
  id: string;
  room_id: string;
  inspection_id: string;
  audio_uri: string;
  room_context: {
    room_name: string;
    room_type: string;
    state: string;
    report_type: string;
    address: string;
    date: string;
  };
  queued_at: string;
  status: 'queued' | 'processing' | 'failed';
}
