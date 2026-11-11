import { it, expect, describe, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useAuthUser } from './useAuth';

type Listener = (event: AuthChangeEvent, session: Session | null) => void;

const unsubscribe = vi.fn();
let listener: Listener;

vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: Listener) => {
        listener = callback;
        return { data: { subscription: { unsubscribe } } };
      }
    }
  }
}));

describe('useAuthUser', () => {
  it('follows the user as they log in and out', () => {
    const { result, unmount } = renderHook(() => useAuthUser());

    // Unknown until Supabase has read the saved session
    expect(result.current).toBeUndefined();

    act(() => listener('INITIAL_SESSION', null));
    expect(result.current).toBeNull();

    const user = { id: 'user-1' };
    act(() => listener('SIGNED_IN', { user } as Session));
    expect(result.current).toBe(user);

    act(() => listener('SIGNED_OUT', null));
    expect(result.current).toBeNull();

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
