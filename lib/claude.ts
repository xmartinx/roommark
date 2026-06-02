// ============================================================================
// RoomMark — Claude API types and helpers
//
// The real edge function client (processRoomObservation) lives in:
//   lib/edgeFunction.ts
//
// These interfaces are kept for future direct Claude API usage (e.g. prompt
// generation helpers, response validation). The edge function proxy pattern
// means the app never calls Claude directly — all calls go through Supabase
// Edge Functions.
// ============================================================================

export interface RoomObservationRequest {
  audioBase64: string;
  roomName: string;
  roomType: string;
  state: string;
  reportType: 'ingoing' | 'routine' | 'outgoing';
  address: string;
  inspectionDate: string;
  prescribedItems: string[];
}

export interface RoomObservationResponse {
  items: Array<{
    itemKey: string;
    itemLabel: string;
    clean: boolean | null;
    undamaged: boolean | null;
    working: boolean | null;
    notes: string | null;
    flagged: boolean;
  }>;
  generalNotes: string | null;
  overallCondition: 'good' | 'fair' | 'poor' | null;
}
