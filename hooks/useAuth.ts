import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchProfileWithRetry } from '@/lib/profile';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@/lib/profile';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ------------------------------------------------------------------
  // Fetch profile with retry — handles the auth trigger race condition
  // (Rule 9). After sign-in, the first attempt succeeds immediately.
  // ------------------------------------------------------------------
  const loadProfile = useCallback(async (userId: string) => {
    const data = await fetchProfileWithRetry(userId);
    setProfile(data);
    return data;
  }, []);

  // ------------------------------------------------------------------
  // Public: refresh the profile (after profile-setup completes)
  // ------------------------------------------------------------------
  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) return;
    await loadProfile(session.user.id);
  }, [session?.user.id, loadProfile]);

  // ------------------------------------------------------------------
  // Sign out
  // ------------------------------------------------------------------
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  // ------------------------------------------------------------------
  // Listen for auth state changes, fetch profile on sign-in
  // ------------------------------------------------------------------
  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user.id) {
        loadProfile(initialSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user.id) {
          setLoading(true);
          await loadProfile(newSession.user.id);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  return { session, profile, loading, refreshProfile, signOut };
}
