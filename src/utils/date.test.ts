import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { formatDeliveryDate, formatDeliveryStatus, formatDate } from './date';

describe('formatDeliveryDate', () => {
  it('shows the weekday, month and day', () => {
    expect(formatDeliveryDate(new Date(2025, 4, 18).getTime())).toBe('Sunday, May 18');
  });
});

describe('formatDate', () => {
  it('shows the month, day and year', () => {
    expect(formatDate(new Date(2025, 4, 18, 9).toISOString())).toBe('May 18, 2025');
  });
});

describe('formatDeliveryStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 4, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('says delivered when the delivery date has passed', () => {
    expect(formatDeliveryStatus(new Date(2025, 4, 14).getTime())).toBe('Delivered on Wednesday, May 14');
  });

  it('says arriving when the delivery date is still ahead', () => {
    expect(formatDeliveryStatus(new Date(2025, 4, 18).getTime())).toBe('Arriving on Sunday, May 18');
  });
});
