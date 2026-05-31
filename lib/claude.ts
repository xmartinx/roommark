// Claude API client — edge function proxy.
// All Claude calls go through Supabase Edge Functions, not called directly from the app.
// This module will provide typed helpers for the process-room-observation edge function.

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

// Placeholder — edge function call will be implemented in a future task
export async function processRoomObservation(
  _request: RoomObservationRequest
): Promise<RoomObservationResponse> {
  throw new Error('Not implemented — edge function call coming in a future task');
}
