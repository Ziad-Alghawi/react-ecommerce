import { createContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

export interface Auth {
  user: User | null;
  logOut: () => Promise<void>;
}

// Null when accounts are turned off, so nothing offers a login
export const AuthContext = createContext<Auth | null>(null);

// Undefined until Supabase has read the saved session, null for a guest
export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(supabase ? undefined : null);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return user;
}
