export const SORT_OPTIONS = [
  { value: '', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Customer rating' },
  { value: 'newest', label: 'Newest' }
];

export interface Filters {
  search: string;
  category: string;
  sort: string;
  // In dollars, as typed. Empty for no limit
  minPrice: string;
  maxPrice: string;
}

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

// The filters in the page URL. Anything the API would refuse, like a sort that doesn't exist, is left out
export function readProductFilters(params: URLSearchParams): Filters {
  const sort = params.get('sort') ?? '';
  const readPrice = (name: string) => {
    const price = params.get(name) ?? '';
    return PRICE_PATTERN.test(price) ? price : '';
  };

  return {
    search: params.get('search') ?? '',
    category: params.get('category') ?? '',
    sort: SORT_OPTIONS.some(({ value }) => value === sort) ? sort : '',
    minPrice: readPrice('minPrice'),
    maxPrice: readPrice('maxPrice')
  };
}

export function getProductsUrl({ search, category, sort, minPrice, maxPrice }: Filters) {
  const query = new URLSearchParams();
  const toCents = (price: string) => String(Math.round(Number(price) * 100));

  if (search) query.set('search', search);
  if (category) query.set('category', category);
  if (minPrice) query.set('minPriceCents', toCents(minPrice));
  if (maxPrice) query.set('maxPriceCents', toCents(maxPrice));
  if (sort) query.set('sort', sort);

  const queryString = query.toString();
  return queryString ? `/api/products?${queryString}` : '/api/products';
}

// The page URL's query with some filters changed. An empty value removes the filter
export function withFilters(params: URLSearchParams, changes: Partial<Record<keyof Filters, string>>) {
  const next = new URLSearchParams(params);
  for (const [name, value] of Object.entries(changes)) {
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
  }
  return next;
}
