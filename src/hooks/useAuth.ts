import { createContext, useEffect, useState } from 'react';
import axios from 'axios';
import type { Subscription, User } from '@supabase/supabase-js';
import { authStorageKey, isAuthEnabled, loadSupabase, mayHaveSession, supabaseLoaded } from '../utils/supabase';

export interface Auth {
  user: User | null;
  isAdmin: boolean;
  logOut: () => Promise<void>;
}

// Null when accounts are turned off, so nothing offers a login
export const AuthContext = createContext<Auth | null>(null);

// Undefined until Supabase has read the saved session, null for a guest.
// Without a saved session the visitor is a guest right away, and Supabase isn't loaded
export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(mayHaveSession() ? undefined : null);

  useEffect(() => {
    if (!isAuthEnabled) {
      return;
    }
    let isMounted = true;
    let subscription: Subscription | undefined;

    // Whatever loads the client (this hook or the login page), follow the user from then on
    supabaseLoaded.then((supabase) => {
      if (isMounted) {
        subscription = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null);
        }).data.subscription;
      }
    });

    if (mayHaveSession()) {
      // Without the library the session can't be used, so carry on as a guest
      loadSupabase().catch(() => setUser(null));
    }

    const loadOnLoginElsewhere = (event: StorageEvent) => {
      if (event.key === authStorageKey && event.newValue) {
        loadSupabase().catch(() => {});
      }
    };
    window.addEventListener('storage', loadOnLoginElsewhere);

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('storage', loadOnLoginElsewhere);
    };
  }, []);

  return user;
}

// Only the API can tell, from the verified token, whether the user is an admin. Guests never are
export function useIsAdmin(userId: string | undefined) {
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }
    let isCurrentUser = true;
    axios.get<{ isAdmin: boolean }>('/api/me')
      .then(({ data }) => {
        if (isCurrentUser && data?.isAdmin === true) {
          setAdminId(userId);
        }
      })
      // The admin link stays hidden, and the store works as usual
      .catch(() => {});
    return () => {
      isCurrentUser = false;
    };
  }, [userId]);

  return Boolean(userId) && adminId === userId;
}
