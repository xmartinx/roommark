// ============================================================================
// RoomMark — edge function client
// Typed helper for calling the process-room-observation edge function.
// ============================================================================

import type {
  ClaudeRoomAssessment,
  EdgeFunctionRequest,
  RoomAssessmentResult,
} from '@/lib/types';
import type { RoomItemTemplate } from '@/constants/roomTemplates';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface ProcessRoomObservationParams {
  audioBase64: string;
  roomName: string;
  roomType: string;
  state: string;
  reportType: string;
  address: string;
  date: string;
  inspectionId: string;
  roomId: string;
  prescribedItems: RoomItemTemplate[];
  existingItems?: Array<{
    item_key: string;
    item_label: string;
    clean: boolean | null;
    undamaged: boolean | null;
    working: boolean | null;
    notes: string | null;
  }>;
  accessToken: string;
  supabaseUrl: string;
}

export async function processRoomObservation(
  params: ProcessRoomObservationParams,
): Promise<RoomAssessmentResult> {
  const requestBody: EdgeFunctionRequest = {
    audio_base64: params.audioBase64,
    room_name: params.roomName,
    room_type: params.roomType,
    state: params.state,
    report_type: params.reportType,
    address: params.address,
    date: params.date,
    inspection_id: params.inspectionId,
    room_id: params.roomId,
    prescribed_items: params.prescribedItems,
    ...(params.existingItems?.length ? { existing_items: params.existingItems } : {}),
  };

  // Size check: warn if audio is large enough to risk timeout
  if (params.audioBase64.length > 150000) {
    console.warn('[Audio] Large file warning:',
      params.audioBase64.length, 'chars — may cause timeout');
  }

  const url = `${params.supabaseUrl}/functions/v1/process-room-observation`;
  console.log('[Edge Function URL]', url);
  console.log('[Edge Function Auth] Token length:', params.accessToken?.length ?? 0);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const json = await response.json();

  // Log edge function errors for debugging
  if (json.error) {
    console.error(
      `[processRoomObservation] error=${json.error}`,
      json.message ?? '',
    );
    return {
      success: false,
      error: json.error,
      rawTranscript: json.raw_transcript,
      rawResponse: json.raw_response,
    };
  }

  // Validate the assessment shape
  if (!json.room_name || !json.items) {
    console.error('[Edge Function] Unexpected response shape:', Object.keys(json));
    return {
      success: false,
      error: 'unexpected_response',
      rawResponse: JSON.stringify(json),
    };
  }

  console.log('[Edge Function] Assessment received:',
    Object.keys(json.items).length, 'items, condition:', json.overall_condition);

  return {
    success: true,
    assessment: json as ClaudeRoomAssessment,
  };
}

// ---------------------------------------------------------------------------
// Chunked base64 helper — CLAUDE.md Rule 7
// ---------------------------------------------------------------------------

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
