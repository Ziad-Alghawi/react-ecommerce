import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

const getSession = vi.fn();
const signOut = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getSession, signOut } })
}));

async function loadModule(isConfigured = true) {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', isConfigured ? 'https://demo.supabase.co' : '');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', isConfigured ? 'sb_publishable_demo' : '');
  return import('./supabase');
}

const requestConfig = () => ({ headers: new AxiosHeaders() }) as InternalAxiosRequestConfig;

const rejectionWithStatus = (status: number) => new AxiosError('Request failed', undefined, undefined, null, {
  status, statusText: '', headers: {}, config: requestConfig(), data: {}
});

describe('supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('turns accounts off when the project is not configured', async () => {
    const { supabase, addAccessToken } = await loadModule(false);

    expect(supabase).toBeNull();
    const config = await addAccessToken(requestConfig());
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('sends the access token of a logged in user', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'token-1' } } });
    const { addAccessToken } = await loadModule();

    const config = await addAccessToken(requestConfig());

    expect(config.headers.Authorization).toBe('Bearer token-1');
  });

  it('sends no token for a guest', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { addAccessToken } = await loadModule();

    const config = await addAccessToken(requestConfig());

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('logs out when the API rejects the session, and only then', async () => {
    const { logOutIfSessionRejected } = await loadModule();

    await expect(logOutIfSessionRejected(rejectionWithStatus(500))).rejects.toThrow();
    expect(signOut).not.toHaveBeenCalled();

    const rejection = rejectionWithStatus(401);
    await expect(logOutIfSessionRejected(rejection)).rejects.toBe(rejection);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
