import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAction } from './useAction';
import { loadSupabase } from '../utils/supabase';

type AuthRequest = (supabase: SupabaseClient) => Promise<{ error: { message: string } | null }>;

// Submits a login, sign up or password form to Supabase, and keeps the error to show with the form
export function useAuthRequest(request: AuthRequest) {
  const [error, setError] = useState<string | null>(null);

  // Start downloading Supabase while the user types
  useEffect(() => {
    loadSupabase().catch(() => {});
  }, []);

  const [submit, isPending] = useAction(async () => {
    setError(null);
    const supabase = await loadSupabase().catch(() => null);
    if (!supabase) {
      setError("We couldn't reach the login service. Check your connection and try again.");
      return;
    }
    const { error } = await request(supabase);
    setError(error?.message ?? null);
  });

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  return { submitForm, isPending, error, clearError: () => setError(null) };
}
