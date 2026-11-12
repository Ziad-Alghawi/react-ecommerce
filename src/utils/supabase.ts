import type { SupabaseClient } from '@supabase/supabase-js';
import { isAxiosError, type InternalAxiosRequestConfig } from 'axios';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Without a Supabase project the store runs in guest-only mode, with no login
export const isAuthEnabled = Boolean(url && publishableKey);

// Where Supabase saves the session (its default name, set here so it can be checked
// without loading the library)
export const authStorageKey = isAuthEnabled ? `sb-${new URL(url!).hostname.split('.')[0]}-auth-token` : '';

let loadedClient: SupabaseClient | null = null;
let loadingClient: Promise<SupabaseClient> | undefined;
let resolveClient: (client: SupabaseClient) => void;

// Settles once something has loaded the client, without loading it itself
export const supabaseLoaded = new Promise<SupabaseClient>((resolve) => {
  resolveClient = resolve;
});

// The library is only downloaded when it's needed, so guests who never log in skip it
export function loadSupabase() {
  if (!loadingClient) {
    loadingClient = import('@supabase/supabase-js').then(({ createClient }) => {
      loadedClient = createClient(url!, publishableKey!, { auth: { storageKey: authStorageKey } });
      resolveClient(loadedClient);
      return loadedClient;
    });
    // A failed download, for example while offline, can be tried again
    loadingClient.catch(() => {
      loadingClient = undefined;
    });
  }
  return loadingClient;
}

// A saved session, or the link from a confirmation email that logs the user in
export function mayHaveSession() {
  if (!isAuthEnabled) {
    return false;
  }
  try {
    if (localStorage.getItem(authStorageKey)) {
      return true;
    }
  } catch {
    // Storage can be blocked, for example in some private windows
  }
  return /\b(access_token|error_description)=/.test(window.location.hash);
}

export async function logOut() {
  // Only this browser, so the user stays logged in on their other devices
  await loadedClient?.auth.signOut({ scope: 'local' });
}

// A logged in user's requests use their account's cart and orders instead of this browser's.
// Without a loaded client there's no session. getSession refreshes an expired token first
export async function addAccessToken(config: InternalAxiosRequestConfig) {
  const session = loadedClient && (await loadedClient.auth.getSession()).data.session;
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
