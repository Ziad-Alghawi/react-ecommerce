import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Without a Supabase project the store runs in guest-only mode, with no login
export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;

export async function logOut() {
  // Only this browser, so the user stays logged in on their other devices
  await supabase?.auth.signOut({ scope: 'local' });
}
