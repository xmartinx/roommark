import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  full_name: string;
  agency_name: string | null;
  phone: string | null;
  email: string | null;
  default_state: string;
  show_photo_timestamps: boolean;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileUpsert = Pick<
  Profile,
  'id' | 'full_name' | 'agency_name' | 'phone' | 'email' | 'default_state' | 'show_photo_timestamps'
>;

// ---------------------------------------------------------------------------
// fetchProfileWithRetry — Rule 9
//
// After signUp(), the auth trigger has a race condition: the trigger may not
// have finished creating the profiles row yet. Retry up to 3 times with a
// 500ms delay between attempts.
// ---------------------------------------------------------------------------

export async function fetchProfileWithRetry(
  userId: string,
  attempts = 3
): Promise<Profile | null> {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data && !error) return data as Profile;

    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// fetchProfile — single attempt (for sign-in flow where trigger already ran)
// ---------------------------------------------------------------------------

export async function fetchProfile(
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as Profile;
}

// ---------------------------------------------------------------------------
// upsertProfile — create or update a profile row
// ---------------------------------------------------------------------------

export async function upsertProfile(
  profile: ProfileUpsert
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: profile.id,
      full_name: profile.full_name,
      agency_name: profile.agency_name ?? null,
      phone: profile.phone ?? null,
      email: profile.email ?? null,
      default_state: profile.default_state,
      show_photo_timestamps: profile.show_photo_timestamps,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, error: null };
}
