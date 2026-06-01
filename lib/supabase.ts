import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // In-memory session storage — sessions persist within the app lifecycle
    // but not across restarts. Configure AsyncStorage adapter after first
    // EAS build to enable persistent sessions.
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
