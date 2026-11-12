import { it, expect, describe, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useAuthUser } from './useAuth';
import { loadSupabase, mayHaveSession } from '../utils/supabase';

type Listener = (event: AuthChangeEvent, session: Session | null) => void;

const fake = vi.hoisted(() => {
  const fake = {
    listener: undefined as ((...args: never[]) => void) | undefined,
    unsubscribe: () => {},
    client: {} as object,
    resolveLoaded: (() => {}) as (client: object) => void,
    loaded: Promise.resolve({})
  };
  fake.client = {
    auth: {
      onAuthStateChange: (callback: () => void) => {
        fake.listener = callback;
        return { data: { subscription: { unsubscribe: () => fake.unsubscribe() } } };
      }
    }
  };
  return fake;
});

vi.mock('../utils/supabase', () => ({
  isAuthEnabled: true,
  authStorageKey: 'sb-demo-auth-token',
  get supabaseLoaded() {
    return fake.loaded;
  },
  loadSupabase: vi.fn(),
  mayHaveSession: vi.fn()
}));

const emit = (event: AuthChangeEvent, session: Session | null) => (fake.listener as Listener)(event, session);

describe('useAuthUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.listener = undefined;
    fake.unsubscribe = vi.fn();
    fake.loaded = new Promise((resolve) => {
      fake.resolveLoaded = resolve;
    });
    vi.mocked(loadSupabase).mockImplementation(async () => {
      fake.resolveLoaded(fake.client);
      return fake.client as never;
    });
  });

  it('treats a visitor without a saved session as a guest, without loading Supabase', () => {
    vi.mocked(mayHaveSession).mockReturnValue(false);

    const { result } = renderHook(() => useAuthUser());

    expect(result.current).toBeNull();
    expect(loadSupabase).not.toHaveBeenCalled();
  });

  it('follows a saved session as the user logs in and out', async () => {
    vi.mocked(mayHaveSession).mockReturnValue(true);
    const { result, unmount } = renderHook(() => useAuthUser());

    // Unknown until Supabase has read the saved session
    expect(result.current).toBeUndefined();
    await act(() => fake.loaded);

    act(() => emit('INITIAL_SESSION', null));
    expect(result.current).toBeNull();

    const user = { id: 'user-1' };
    act(() => emit('SIGNED_IN', { user } as Session));
    expect(result.current).toBe(user);

    act(() => emit('SIGNED_OUT', null));
    expect(result.current).toBeNull();

    unmount();
    expect(fake.unsubscribe).toHaveBeenCalled();
  });

  it('follows a guest who logs in on the login page or in another tab', async () => {
    vi.mocked(mayHaveSession).mockReturnValue(false);
    const { result } = renderHook(() => useAuthUser());

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'other-key', newValue: '{}' }));
    });
    expect(loadSupabase).not.toHaveBeenCalled();

    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'sb-demo-auth-token', newValue: '{}' }));
      await fake.loaded;
    });
    expect(loadSupabase).toHaveBeenCalledTimes(1);

    const user = { id: 'user-1' };
    act(() => emit('INITIAL_SESSION', { user } as Session));
    expect(result.current).toBe(user);
  });

  it('carries on as a guest when Supabase fails to download', async () => {
    vi.mocked(mayHaveSession).mockReturnValue(true);
    vi.mocked(loadSupabase).mockRejectedValue(new Error('Offline'));

    const { result } = renderHook(() => useAuthUser());

    expect(result.current).toBeUndefined();
    await act(async () => {});
    expect(result.current).toBeNull();
  });
});
