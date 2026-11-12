import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { SORT_OPTIONS, withFilters, type Filters } from '../../utils/productFilters';

interface PriceFilterProps {
  filters: Filters;
  onApply: (minPrice: string, maxPrice: string) => void;
}

function PriceFilter({ filters, onApply }: PriceFilterProps) {
  const [minPrice, setMinPrice] = useState(filters.minPrice);
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice);

  const applyPrices = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isReversed = minPrice && maxPrice && Number(minPrice) > Number(maxPrice);
    onApply(isReversed ? maxPrice : minPrice, isReversed ? minPrice : maxPrice);
  };

  return (
    <form className="price-filter" onSubmit={applyPrices} aria-label="Price">
      <label className="price-filter-field">
        <span className="visually-hidden">Minimum price in dollars</span>
        <span aria-hidden="true">$</span>
        <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Min" value={minPrice}
          onChange={(event) => setMinPrice(event.target.value)} data-testid="min-price-input" />
      </label>
      <span aria-hidden="true">to</span>
      <label className="price-filter-field">
        <span className="visually-hidden">Maximum price in dollars</span>
        <span aria-hidden="true">$</span>
        <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Max" value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)} data-testid="max-price-input" />
      </label>
      <button className="button-secondary" type="submit" data-testid="price-apply-button">Apply</button>
    </form>
  );
}

interface ProductFiltersProps {
  categories: string[];
  filters: Filters;
  // Unknown while the products load
  productCount: number | null;
}

// Every choice is kept in the URL, so links and the back button bring it back
export function ProductFilters({ categories, filters, productCount }: ProductFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const hasFilters = Boolean(filters.category || filters.minPrice || filters.maxPrice || filters.sort);
  const linkWith = (changes: Partial<Filters>) => `?${withFilters(searchParams, changes)}`;

  return (
    <div className="product-filters">
      {categories.length > 0 && (
        <nav aria-label="Categories">
          <ul className="category-chips">
            {['', ...categories].map((category) => (
              <li key={category}>
                <Link className="category-chip" to={linkWith({ category })}
                  aria-current={filters.category === category ? 'true' : undefined}
                  data-testid="category-chip">
                  {category || 'All'}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="product-toolbar">
        <div className="product-toolbar-summary">
          <p className="products-count" role="status" data-testid="products-count">
            {productCount !== null && `${productCount} ${productCount === 1 ? 'product' : 'products'}`}
          </p>
          {hasFilters && (
            <Link className="link-primary" to={linkWith({ category: '', minPrice: '', maxPrice: '', sort: '' })}
              data-testid="clear-filters-link">
              Clear filters
            </Link>
          )}
        </div>

        <div className="product-toolbar-controls">
          {/* Starts again from the URL when it changes, for example with the back button */}
          <PriceFilter key={`${filters.minPrice}-${filters.maxPrice}`} filters={filters}
            onApply={(minPrice, maxPrice) => setSearchParams(withFilters(searchParams, { minPrice, maxPrice }))} />

          <label className="sort-field">
            Sort by
            <select value={filters.sort} data-testid="sort-select"
              onChange={(event) => setSearchParams(withFilters(searchParams, { sort: event.target.value }))}>
              {SORT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
