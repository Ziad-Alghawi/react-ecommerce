import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { getVisitorId } from './visitorId';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('getVisitorId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a random ID on the first visit and saves it', () => {
    const visitorId = getVisitorId();

    expect(visitorId).toMatch(UUID_PATTERN);
    expect(localStorage.getItem('visitorId')).toBe(visitorId);
  });

  it('keeps the same ID on later visits', () => {
    const visitorId = getVisitorId();

    expect(getVisitorId()).toBe(visitorId);
  });

  it('replaces a saved ID that the API would reject', () => {
    localStorage.setItem('visitorId', 'not-a-uuid');

    const visitorId = getVisitorId();

    expect(visitorId).toMatch(UUID_PATTERN);
    expect(localStorage.getItem('visitorId')).toBe(visitorId);
  });

  it('still returns an ID when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });

    expect(getVisitorId()).toMatch(UUID_PATTERN);
  });
});
