import { getUserId } from './auth.js';

// Supabase user IDs, comma-separated. Being an admin is only ever decided from a verified token
const adminIds = new Set((process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map((id) => id.trim().toLowerCase())
  .filter(Boolean));

export function isAdmin(userId) {
  return adminIds.has(userId);
}

export async function requireAdmin(req, res, next) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Please log in as an admin.' });
    }
    if (!isAdmin(userId)) {
      return res.status(403).json({ error: 'Only admins can do this.' });
    }
  } catch (error) {
    return next(error);
  }
  next();
}
