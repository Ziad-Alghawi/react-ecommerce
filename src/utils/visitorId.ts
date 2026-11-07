const STORAGE_KEY = 'visitorId';
// The same check the API does, so a damaged saved ID is replaced instead of failing every request
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Identifies this browser to the API, so each visitor gets their own cart and orders
export function getVisitorId(): string {
  try {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId && UUID_PATTERN.test(savedId)) {
      return savedId;
    }
  } catch {
    // Storage can be blocked, for example in some private windows
  }

  const visitorId = crypto.randomUUID();
  try {
    localStorage.setItem(STORAGE_KEY, visitorId);
  } catch {
    // Without storage the cart only lasts until the page is reloaded
  }
  return visitorId;
}
