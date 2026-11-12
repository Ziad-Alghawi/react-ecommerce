import { it, expect, describe, vi, beforeEach } from 'vitest';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

const getSession = vi.fn();
const signOut = vi.fn();
const createClient = vi.fn((...args: unknown[]) => ({ args, auth: { getSession, signOut } }));

vi.mock('@supabase/supabase-js', () => ({ createClient }));

// The module reads its settings when it loads, so each variant is a fresh copy. Loading them
// here rather than in each test keeps the slow first import out of the test timeouts
async function loadModule(isConfigured: boolean) {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', isConfigured ? 'https://demo.supabase.co' : '');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', isConfigured ? 'sb_publishable_demo' : '');
  const module = await import('./supabase');
  vi.unstubAllEnvs();
  return module;
}

const notConfigured = await loadModule(false);
const guest = await loadModule(true);
const loading = await loadModule(true);
const loaded = await loadModule(true);
await loaded.loadSupabase();

const requestConfig = () => ({ headers: new AxiosHeaders() }) as InternalAxiosRequestConfig;

const rejectionWithStatus = (status: number) => new AxiosError('Request failed', undefined, undefined, null, {
  status, statusText: '', headers: {}, config: requestConfig(), data: {}
});

describe('supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.location.hash = '';
  });

  it('turns accounts off when the project is not configured', async () => {
    expect(notConfigured.isAuthEnabled).toBe(false);
    expect(notConfigured.mayHaveSession()).toBe(false);

    const config = await notConfigured.addAccessToken(requestConfig());
    expect(config.headers.Authorization).toBeUndefined();
  });

  it("doesn't load Supabase for a guest's requests or logging out", async () => {
    const config = await guest.addAccessToken(requestConfig());
    await guest.logOut();

    expect(config.headers.Authorization).toBeUndefined();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('creates the client once, with the storage key it checks for a session', async () => {
    const [client, sameClient] = await Promise.all([loading.loadSupabase(), loading.loadSupabase()]);

    expect(sameClient).toBe(client);
    expect(await loading.supabaseLoaded).toBe(client);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith('https://demo.supabase.co', 'sb_publishable_demo', {
      auth: { storageKey: 'sb-demo-auth-token' }
    });
  });

  it('only sees a possible session in storage or in the link from a confirmation email', () => {
    expect(guest.mayHaveSession()).toBe(false);

    localStorage.setItem('sb-demo-auth-token', '{}');
    expect(guest.mayHaveSession()).toBe(true);

    localStorage.clear();
    window.location.hash = '#access_token=token-1&type=signup';
    expect(guest.mayHaveSession()).toBe(true);
  });

  it('sends the access token of a logged in user', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'token-1' } } });

    const config = await loaded.addAccessToken(requestConfig());

    expect(config.headers.Authorization).toBe('Bearer token-1');
  });

  it('sends no token once logged out', async () => {
    getSession.mockResolvedValue({ data: { session: null } });

    const config = await loaded.addAccessToken(requestConfig());

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('logs out when the API rejects the session, and only then', async () => {
    await expect(loaded.logOutIfSessionRejected(rejectionWithStatus(500))).rejects.toThrow();
    expect(signOut).not.toHaveBeenCalled();

    const rejection = rejectionWithStatus(401);
    await expect(loaded.logOutIfSessionRejected(rejection)).rejects.toBe(rejection);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
