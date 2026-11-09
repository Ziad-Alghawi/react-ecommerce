import type { CartItem } from '../types/store';

export function getCartQuantity(cart: CartItem[]) {
  return cart.reduce((total, cartItem) => total + cartItem.quantity, 0);
}
