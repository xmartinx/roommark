// ============================================================================
// RoomMark — process-room-observation edge function
// Receives audio + room context → Whisper transcription → Claude structuring →
// returns structured room assessment JSON.
// ============================================================================

/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrescribedItem {
  key: string;
  label: string;
  hasWorking: boolean;
}

interface RequestBody {
  audio_base64: string;
  room_name: string;
  room_type: string;
  state: string;
  report_type: string;
  address: string;
  date: string;
  inspection_id: string;
  room_id: string;
  prescribed_items: PrescribedItem[];
}

interface AssessedItem {
  clean: boolean;
  undamaged: boolean;
  working: boolean | null;
  notes: string;
  flagged: boolean;
}

interface MaintenanceSuggestion {
  description: string;
  priority: 'low' | 'medium' | 'urgent';
  responsibility: 'tenant' | 'landlord' | 'unknown';
}

interface ClaudeResponse {
  room_name: string;
  overall_condition: 'good' | 'fair' | 'poor';
  items: Record<string, AssessedItem>;
  maintenance_items: MaintenanceSuggestion[];
  general_notes: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function buildSystemPrompt(body: RequestBody): string {
  const itemsList = body.prescribed_items
    .map((item) => `- ${item.key}: "${item.label}"`)
    .join('\n');

  return `You are a property inspection assistant for Australian rental property condition reports. You process voice observations made by a property manager or landlord during a room-by-room inspection and return structured JSON for inclusion in a legally compliant condition report.

CONTEXT
State: ${body.state}
Report type: ${body.report_type}
Room name: ${body.room_name}
Room type: ${body.room_type}
Property address: ${body.address}
Inspection date: ${body.date}

PRESCRIBED ITEMS FOR THIS ROOM
The following items must be assessed if mentioned in the transcript. Do not assess items not mentioned. Do not fabricate assessments.
${itemsList}

INSTRUCTIONS
1. Read the transcript carefully.
2. For each item mentioned, extract:
   - clean: true if described as clean, false if dirty/stained/marked
   - undamaged: true if no damage mentioned, false if damage mentioned
   - working: true if functioning, false if not functioning, null if not applicable (structural items where hasWorking is false)
   - notes: a single professional sentence describing condition. Use formal property inspection language. Maximum 30 words. Present tense. Objective tone.
   - flagged: true if the observation is ambiguous, concerning, or requires physical verification. Otherwise false.
3. If an item is mentioned but condition is unclear, set flagged: true and append [CHECK] to the notes field.
4. If an item is not mentioned in the transcript, omit it entirely from the output. Do not include it with null values.
5. Extract maintenance items into the maintenance_items array.
6. Determine overall_condition: "good"|"fair"|"poor"
   - good: all items clean, undamaged, working
   - fair: minor issues noted, nothing requiring urgent action
   - poor: significant issues, damage, or non-functioning items

OUTPUT FORMAT
Return only valid JSON. No preamble. No explanation. No markdown code fences. Start with { and end with }.

{
  "room_name": "string",
  "overall_condition": "good"|"fair"|"poor",
  "items": {
    "[item_key]": {
      "clean": true|false,
      "undamaged": true|false,
      "working": true|false|null,
      "notes": "string",
      "flagged": true|false
    }
  },
  "maintenance_items": [
    {
      "description": "string",
      "priority": "low"|"medium"|"urgent",
      "responsibility": "tenant"|"landlord"|"unknown"
    }
  ],
  "general_notes": "string|null"
}`;
}

function cleanClaudeResponse(text: string): string {
  let cleaned = text.trim();
  // Remove markdown fences if present
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    cleaned = cleaned.slice(firstNewline + 1);
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(),
    });
  }

  // Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: corsHeaders(),
    });
  }

  const token = authHeader.slice(7);
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  // Verify JWT with Supabase
  try {
    const verifyRes = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey,
        },
      },
    );
    if (!verifyRes.ok) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: corsHeaders(),
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Auth verification failed' }), {
      status: 401,
      headers: corsHeaders(),
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 200,
      headers: corsHeaders(),
    });
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  const anthropicModel =
    Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-6';

  // ------------------------------------------------------------------
  // Step 1: Transcribe with Whisper
  // ------------------------------------------------------------------
  let transcript: string;
  try {
    const audioBytes = base64ToUint8Array(body.audio_base64);

    // Diagnostic: log audio buffer details
    console.log('[Edge Debug] Audio base64 length:', body.audio_base64.length);
    console.log('[Edge Debug] Audio buffer size:', audioBytes.byteLength, 'bytes');
    console.log('[Edge Debug] First 8 bytes (hex):',
      Array.from(audioBytes.slice(0, 8))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' '));

    // Use .buffer to pass an ArrayBuffer to Blob — required for Deno
    // compatibility. MIME type and filename extension tell Whisper the
    // audio format. expo-audio records in .m4a (AAC in MP4 container).
    const audioBlob = new Blob(
      [audioBytes.buffer],
      { type: 'audio/m4a' },
    );
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.m4a');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const whisperRes = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
        body: formData,
      },
    );

    const whisperJson = await whisperRes.json();

    if (!whisperRes.ok || !whisperJson.text) {
      return new Response(
        JSON.stringify({
          error: 'transcription_failed',
          message: whisperJson.error?.message ?? 'Whisper transcription failed',
        }),
        { status: 200, headers: corsHeaders() },
      );
    }

    transcript = whisperJson.text;
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'transcription_failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 200, headers: corsHeaders() },
    );
  }

  // ------------------------------------------------------------------
  // Step 2: Structure with Claude
  // ------------------------------------------------------------------
  let claudeText: string;
  try {
    const systemPrompt = buildSystemPrompt(body);
    const userMessage =
      `TRANSCRIPT:\n${transcript}\n\n` +
      `Assess the items mentioned above for the ${body.room_name} ` +
      `in this ${body.report_type} condition report for a ` +
      `${body.state} rental property.`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    const claudeJson = await claudeRes.json();

    if (!claudeRes.ok) {
      return new Response(
        JSON.stringify({
          error: 'structuring_failed',
          raw_transcript: transcript,
          message: claudeJson.error?.message ?? 'Claude API error',
        }),
        { status: 200, headers: corsHeaders() },
      );
    }

    claudeText = claudeJson.content?.[0]?.text ?? '';
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'structuring_failed',
        raw_transcript: transcript,
        message: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 200, headers: corsHeaders() },
    );
  }

  // ------------------------------------------------------------------
  // Step 3: Parse Claude response
  // ------------------------------------------------------------------
  try {
    const cleaned = cleanClaudeResponse(claudeText);
    const parsed: ClaudeResponse = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch {
    // Parse failure — return raw data so app can handle manually
    return new Response(
      JSON.stringify({
        error: 'parse_failed',
        raw_transcript: transcript,
        raw_response: claudeText,
      }),
      { status: 200, headers: corsHeaders() },
    );
  }
});

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
