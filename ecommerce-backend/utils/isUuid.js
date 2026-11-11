// The format crypto.randomUUID() makes in the browser (any UUID version 1-8)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Postgres rejects a malformed UUID in a query instead of finding nothing, so check IDs first
export function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
