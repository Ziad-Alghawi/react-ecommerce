import { createClient } from '@supabase/supabase-js';
import { isAxiosError, type InternalAxiosRequestConfig } from 'axios';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Without a Supabase project the store runs in guest-only mode, with no login
export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;

export async function logOut() {
  // Only this browser, so the user stays logged in on their other devices
  await supabase?.auth.signOut({ scope: 'local' });
}

// A logged in user's requests use their account's cart and orders instead of this browser's.
// getSession refreshes an expired token first
export async function addAccessToken(config: InternalAxiosRequestConfig) {
  const session = supabase && (await supabase.auth.getSession()).data.session;
  if (session) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
}

// The API refuses a session it can't verify, so carry on as a guest instead of failing every request
export function logOutIfSessionRejected(error: unknown) {
  if (isAxiosError(error) && error.response?.status === 401) {
    logOut();
  }
  return Promise.reject(error);
}
