// At or below this, the shop says how many are left
export const LOW_STOCK = 5;

export function describeStock(stock: number) {
  return stock === 0 ? 'Out of stock' : `Only ${stock} left`;
}
