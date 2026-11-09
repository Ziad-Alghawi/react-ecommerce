import { it, expect, describe } from 'vitest';
import { getCartQuantity } from './cart';
import type { CartItem } from '../types/store';

describe('getCartQuantity', () => {
  it('adds up the quantity of every item', () => {
    const cart = [{ quantity: 2 }, { quantity: 3 }] as CartItem[];

    expect(getCartQuantity(cart)).toBe(5);
  });

  it('is 0 for an empty cart', () => {
    expect(getCartQuantity([])).toBe(0);
  });
});
