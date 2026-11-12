import { it, expect, describe, vi, beforeEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { HomePage } from './HomePage';

vi.mock('axios');

const socks = {
  id: 'e43638ce-6aa0-4b85-b27f-e1d07eb678c6',
  image: 'images/products/gray-hand-knit-wool-socks.jpg',
  name: 'Gray Hand Knit Wool Socks',
  rating: {
    stars: 4.5,
    count: 87
  },
  priceCents: 1090,
  stock: 20,
  keywords: ['socks', 'sports', 'apparel']
};

const basketball = {
  id: '15b6fc6f-327a-4ec4-896f-486349e85a3d',
  image: 'images/products/intermediate-composite-basketball.jpg',
  name: 'Intermediate Size Basketball',
  rating: {
    stars: 4,
    count: 127
  },
  priceCents: 2095,
  stock: 15,
  keywords: ['sports', 'basketballs']
};

const productsByUrl = {
  '/api/products': [socks, basketball],
  '/api/products?search=socks': [socks],
  '/api/products?search=socks&category=Clothing': [socks],
  '/api/products?category=Clothing': [socks],
  '/api/products?category=Sports&maxPriceCents=2500&sort=rating': [basketball],
  '/api/products?sort=price-desc': [basketball, socks],
  '/api/products?minPriceCents=2000&sort=price-desc': [basketball]
};

async function getFromApi(urlPath) {
  if (urlPath === '/api/products/categories') {
    return { data: ['Clothing', 'Sports'] };
  }
  if (urlPath in productsByUrl) {
    return { data: productsByUrl[urlPath] };
  }
  if (urlPath.startsWith('/api/products?')) {
    return { data: [] };
  }
  // The real API answers 404 for anything else, like the old /api/products/search=...
  throw new Error(`Request failed with status code 404: ${urlPath}`);
}

function CurrentUrl() {
  const { search } = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <div data-testid="current-url">{search}</div>
      <button onClick={() => navigate(-1)}>Back</button>
    </>
  );
}

describe('HomePage component', () => {
  let loadCart;
  let user;

  const renderHomePage = (url = '/') => render(
    <MemoryRouter initialEntries={[url]}>
      <HomePage cart={[]} loadCart={loadCart} />
      <CurrentUrl />
    </MemoryRouter>
  );

  beforeEach(() => {
    axios.get.mockClear();
    axios.get.mockImplementation(getFromApi);
    loadCart = vi.fn();
    user = userEvent.setup();
  });

  it('displays the product correctly', async () => {
    render(
      <MemoryRouter>
        <HomePage cart={[]} loadCart={loadCart} />
      </MemoryRouter>
    );

    const productContainers = await screen.findAllByTestId('product-container');

    expect(productContainers.length).toBe(2);
    expect(within(productContainers[0]).getByText(socks.name)).toBeInTheDocument();
    expect(within(productContainers[1]).getByText(basketball.name)).toBeInTheDocument();
  });

  it('adds a product to the cart', async () => {
    render(
      <MemoryRouter>
        <HomePage cart={[]} loadCart={loadCart} />
      </MemoryRouter>
    );

    const productContainers = await screen.findAllByTestId('product-container');

    await user.selectOptions(within(productContainers[0]).getByTestId('quantity-select-selector'), '2');
    await user.click(within(productContainers[0]).getByTestId('add-to-cart-button'));

    await user.selectOptions(within(productContainers[1]).getByTestId('quantity-select-selector'), '3');
    await user.click(within(productContainers[1]).getByTestId('add-to-cart-button'));

    expect(axios.post).toHaveBeenNthCalledWith(1, '/api/cart-items', {
      productId: socks.id,
      quantity: 2
    });
    expect(axios.post).toHaveBeenNthCalledWith(2, '/api/cart-items', {
      productId: basketball.id,
      quantity: 3
    });
    expect(loadCart).toHaveBeenCalledTimes(2);
  });

  it('shows only the products that match the search', async () => {
    render(
      <MemoryRouter initialEntries={['/?search=socks']}>
        <HomePage cart={[]} loadCart={loadCart} />
      </MemoryRouter>
    );

    const productContainers = await screen.findAllByTestId('product-container');

    expect(axios.get).toHaveBeenCalledWith('/api/products?search=socks');
    expect(productContainers.length).toBe(1);
    expect(within(productContainers[0]).getByText(socks.name)).toBeInTheDocument();
  });

  it('encodes special characters in the search text', async () => {
    render(
      <MemoryRouter initialEntries={['/?search=socks%20%26%20shoes']}>
        <HomePage cart={[]} loadCart={loadCart} />
      </MemoryRouter>
    );

    await screen.findByTestId('no-products-message');

    expect(axios.get).toHaveBeenCalledWith('/api/products?search=socks+%26+shoes');
  });

  it('shows a message when no products match the search', async () => {
    render(
      <MemoryRouter initialEntries={['/?search=spaceship']}>
        <HomePage cart={[]} loadCart={loadCart} />
      </MemoryRouter>
    );

    expect(await screen.findByTestId('no-products-message'))
      .toHaveTextContent('No products found for "spaceship"');
    expect(screen.queryByTestId('product-container')).not.toBeInTheDocument();
  });

  it('ignores an older search response that arrives late', async () => {
    let resolveOlderSearch;
    axios.get.mockImplementation((urlPath) => (urlPath === '/api/products?search=socks'
      ? new Promise((resolve) => {
        resolveOlderSearch = resolve;
      })
      : getFromApi(urlPath)));

    render(
      <MemoryRouter initialEntries={['/?search=socks']}>
        <HomePage cart={[]} loadCart={loadCart} />
      </MemoryRouter>
    );

    const searchBar = screen.getByTestId('header-search-bar');
    await user.clear(searchBar);
    await user.type(searchBar, 'spaceship{Enter}');
    await screen.findByTestId('no-products-message');

    await act(async () => {
      resolveOlderSearch({ data: [socks] });
    });

    expect(screen.getByTestId('no-products-message')).toBeInTheDocument();
    expect(screen.queryByTestId('product-container')).not.toBeInTheDocument();
  });

  it('filters by category with the chips, keeping the search', async () => {
    renderHomePage('/?search=socks');
    await screen.findAllByTestId('product-container');

    const chips = await screen.findAllByTestId('category-chip');
    expect(chips.map((chip) => chip.textContent)).toEqual(['All', 'Clothing', 'Sports']);
    expect(chips[0]).toHaveAttribute('aria-current', 'true');

    await user.click(screen.getByRole('link', { name: 'Clothing' }));

    expect(axios.get).toHaveBeenLastCalledWith('/api/products?search=socks&category=Clothing');
    expect(screen.getByTestId('current-url')).toHaveTextContent('?search=socks&category=Clothing');
    expect(screen.getByRole('link', { name: 'Clothing' })).toHaveAttribute('aria-current', 'true');
  });

  it('sorts and filters by price, keeping both in the URL', async () => {
    renderHomePage();
    await screen.findAllByTestId('product-container');

    await user.selectOptions(screen.getByTestId('sort-select'), 'Price: high to low');
    expect(axios.get).toHaveBeenLastCalledWith('/api/products?sort=price-desc');

    await user.type(screen.getByTestId('min-price-input'), '20');
    await user.click(screen.getByTestId('price-apply-button'));

    expect(axios.get).toHaveBeenLastCalledWith('/api/products?minPriceCents=2000&sort=price-desc');
    expect(screen.getByTestId('current-url')).toHaveTextContent('?sort=price-desc&minPrice=20');
    expect(await screen.findByTestId('products-count')).toHaveTextContent('1 product');
  });

  it('swaps a minimum price above the maximum', async () => {
    renderHomePage();
    await screen.findAllByTestId('product-container');

    await user.type(screen.getByTestId('min-price-input'), '30');
    await user.type(screen.getByTestId('max-price-input'), '10');
    await user.click(screen.getByTestId('price-apply-button'));

    expect(screen.getByTestId('current-url')).toHaveTextContent('?minPrice=10&maxPrice=30');
  });

  it('opens a link with filters already chosen', async () => {
    renderHomePage('/?category=Sports&sort=rating&maxPrice=25');

    const productContainers = await screen.findAllByTestId('product-container');

    expect(axios.get).toHaveBeenCalledWith('/api/products?category=Sports&maxPriceCents=2500&sort=rating');
    expect(productContainers).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sports');
    expect(screen.getByTestId('sort-select')).toHaveValue('rating');
    expect(screen.getByTestId('max-price-input')).toHaveValue(25);
    expect(screen.getByTestId('products-count')).toHaveTextContent('1 product');
  });

  it('goes back to the previous filters with the back button', async () => {
    renderHomePage();
    await screen.findAllByTestId('product-container');

    await user.click(await screen.findByRole('link', { name: 'Clothing' }));
    expect(await screen.findAllByTestId('product-container')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(axios.get).toHaveBeenLastCalledWith('/api/products');
    expect(await screen.findAllByTestId('product-container')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'true');
  });

  it('says when nothing matches the filters, and clears them', async () => {
    renderHomePage('/?category=Sports&minPrice=100');

    expect(await screen.findByTestId('no-products-message')).toHaveTextContent('No products match these filters');

    await user.click(screen.getByTestId('clear-filters-link'));

    expect(await screen.findAllByTestId('product-container')).toHaveLength(2);
    expect(screen.getByTestId('current-url')).toBeEmptyDOMElement();
    expect(screen.queryByTestId('clear-filters-link')).not.toBeInTheDocument();
  });
});
