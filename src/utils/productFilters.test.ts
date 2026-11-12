import { it, expect, describe } from 'vitest';
import { getProductsUrl, readProductFilters, withFilters } from './productFilters';

describe('readProductFilters', () => {
  it('reads the filters from the page URL', () => {
    const params = new URLSearchParams('search=socks&category=Home+%26+Kitchen&sort=price-asc&minPrice=10&maxPrice=24.99');

    expect(readProductFilters(params)).toEqual({
      search: 'socks', category: 'Home & Kitchen', sort: 'price-asc', minPrice: '10', maxPrice: '24.99'
    });
  });

  it('leaves out a sort or price the API would refuse', () => {
    const params = new URLSearchParams('sort=cheapest&minPrice=ten&maxPrice=-5');

    expect(readProductFilters(params)).toEqual({ search: '', category: '', sort: '', minPrice: '', maxPrice: '' });
  });
});

describe('getProductsUrl', () => {
  it('asks the API for all products without filters', () => {
    expect(getProductsUrl(readProductFilters(new URLSearchParams()))).toBe('/api/products');
  });

  it('sends the filters with prices in cents', () => {
    const filters = readProductFilters(new URLSearchParams('search=wool socks&category=Clothing&minPrice=9.99&maxPrice=20&sort=rating'));

    expect(getProductsUrl(filters))
      .toBe('/api/products?search=wool+socks&category=Clothing&minPriceCents=999&maxPriceCents=2000&sort=rating');
  });
});

describe('withFilters', () => {
  it('changes some filters and keeps the rest of the URL', () => {
    const params = new URLSearchParams('search=socks&category=Clothing&sort=rating');

    expect(withFilters(params, { category: 'Shoes', sort: '' }).toString()).toBe('search=socks&category=Shoes');
    expect(params.toString()).toBe('search=socks&category=Clothing&sort=rating');
  });
});
