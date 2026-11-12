import { createRemoteJWKSet, errors, jwtVerify } from 'jose';
import { isUuid } from '../utils/isUuid.js';

// Supabase signs sessions with a private key and publishes the public keys,
// so tokens are checked here without any secret. Without SUPABASE_URL, accounts are off
const issuer = process.env.SUPABASE_URL && new URL('/auth/v1', process.env.SUPABASE_URL).href;
const keys = issuer && createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
const KEY_LOADING_ERRORS = [errors.JOSEError.code, errors.JWKSTimeout.code, errors.JWKSInvalid.code];

function invalidSession() {
  return Object.assign(new Error('Your session is invalid or has expired. Please log in again.'), { status: 401 });
}

// The user the request's Bearer token belongs to, or null for a guest
export async function getUser(req) {
  const authorization = req.get('Authorization');
  if (authorization === undefined) {
    return null;
  }

  const token = authorization.match(/^Bearer (\S+)$/i)?.[1];
  if (!token || !keys) {
    throw invalidSession();
  }

  try {
    const { payload } = await jwtVerify(token, keys, { issuer, audience: 'authenticated' });
    if (isUuid(payload.sub)) {
      return { id: payload.sub.toLowerCase(), email: typeof payload.email === 'string' ? payload.email : null };
    }
  } catch (error) {
    // A bad token is the client's fault, but failing to load Supabase's keys is ours
    if (!(error instanceof errors.JOSEError) || KEY_LOADING_ERRORS.includes(error.code)) {
      throw error;
    }
  }
  throw invalidSession();
}

export async function getUserId(req) {
  return (await getUser(req))?.id ?? null;
}

export async function requireUser(req, res, next) {
  try {
    req.user = await getUser(req);
  } catch (error) {
    return next(error);
  }
  if (!req.user) {
    return res.status(401).json({ error: 'Please log in first.' });
  }
  next();
}
