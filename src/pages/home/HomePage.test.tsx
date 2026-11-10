import { it, expect, describe, vi, beforeEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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
  keywords: ['sports', 'basketballs']
};

describe('HomePage component', () => {
  let loadCart;
  let user;

  axios.get.mockImplementation(async (urlPath) => {
    if (urlPath === '/api/products') {
      return { data: [socks, basketball] };
    }
    if (urlPath === '/api/products?search=socks') {
      return { data: [socks] };
    }
    if (urlPath.startsWith('/api/products?search=')) {
      return { data: [] };
    }
    // The real API answers 404 for anything else, like the old /api/products/search=...
    throw new Error(`Request failed with status code 404: ${urlPath}`);
  });

  beforeEach(() => {
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

    expect(axios.get).toHaveBeenCalledWith('/api/products?search=socks%20%26%20shoes');
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
    axios.get.mockImplementationOnce(() => new Promise((resolve) => {
      resolveOlderSearch = resolve;
    }));

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
});
