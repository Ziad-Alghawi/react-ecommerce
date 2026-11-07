import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import axios, { AxiosError } from 'axios';
import App from './App';
import { LoadingMessage } from './components/PageStatus';

const product = {
  id: 'e43638ce-6aa0-4b85-b27f-e1d07eb678c6',
  image: 'images/products/athletic-cotton-socks-6-pairs.jpg',
  name: 'Black and Gray Athletic Cotton Socks - 6 Pairs',
  rating: { stars: 4.5, count: 87 },
  priceCents: 1090,
  keywords: ['socks']
};

const order = {
  id: 'order-1',
  orderTimeMs: 1723456800000,
  totalCostCents: 1090,
  products: [{
    productId: product.id,
    quantity: 1,
    estimatedDeliveryTimeMs: 1723716000000,
    product
  }]
};

const workingApi = {
  '/api/products': { data: [product] },
  '/api/cart-items?expand=product': { data: [] },
  '/api/orders?expand=products': { data: [order] },
  '/api/orders/order-1?expand=products': { data: order },
  '/api/delivery-options?expand=estimatedDeliveryTime': {
    data: [{ id: '1', deliveryDays: 7, priceCents: 0, estimatedDeliveryTimeMs: 1747597994451 }]
  },
  '/api/payment-summary': {
    data: {
      totalItems: 0,
      productCostCents: 0,
      shippingCostCents: 0,
      totalCostBeforeTaxCents: 0,
      taxCents: 0,
      totalCostCents: 0
    }
  }
};

describe('App when the API fails', () => {
  const originalAdapter = axios.defaults.adapter;
  let api;
  let user;
  let requests;

  const renderApp = (url = '/') => render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>
  );

  beforeEach(() => {
    api = { ...workingApi };
    user = userEvent.setup();
    requests = [];

    // Real axios, with only the network replaced, so the interceptor runs too
    axios.defaults.adapter = async (config) => {
      requests.push(`${config.method} ${config.url}`);
      const { status = 200, data } = api[config.url] ?? { status: 500 };
      const response = { data, status, statusText: '', headers: {}, config };

      if (status >= 400) {
        throw new AxiosError('Request failed', undefined, config, null, response);
      }
      return response;
    };
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
  });

  it('shows the footer note on every page', async () => {
    renderApp('/page-that-does-not-exist');

    expect(screen.getByTestId('site-footer'))
      .toHaveTextContent('Demo store, data resets regularly');
  });

  it('shows a loading message until the products arrive', async () => {
    renderApp();

    expect(screen.getByTestId('loading-message')).toBeInTheDocument();
    expect(await screen.findByTestId('product-container')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-message')).not.toBeInTheDocument();
  });

  it('shows an error on the home page and recovers with Try again', async () => {
    api['/api/products'] = { status: 503 };
    renderApp();

    expect(await screen.findByTestId('error-message'))
      .toHaveTextContent("We couldn't load this page");
    expect(screen.getByTestId('header-search-bar')).toBeInTheDocument();

    api['/api/products'] = workingApi['/api/products'];
    await user.click(screen.getByTestId('try-again-button'));

    expect(await screen.findByTestId('product-container')).toBeInTheDocument();
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('treats an HTML page instead of JSON as an error, not a crash', async () => {
    const htmlPage = { data: '<!doctype html><title>Waking up</title>' };
    api['/api/products'] = htmlPage;
    api['/api/cart-items?expand=product'] = htmlPage;
    renderApp();

    expect(await screen.findByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByTestId('header-search-bar')).toBeInTheDocument();
  });

  it('shows an error on the orders page and recovers with Try again', async () => {
    api['/api/orders?expand=products'] = { status: 500 };
    renderApp('/orders');

    await screen.findByTestId('error-message');

    api['/api/orders?expand=products'] = workingApi['/api/orders?expand=products'];
    await user.click(screen.getByTestId('try-again-button'));

    expect(await screen.findByText(product.name)).toBeInTheDocument();
  });

  it('shows an error at checkout when the cart fails and recovers with Try again', async () => {
    api['/api/cart-items?expand=product'] = { status: 500 };
    renderApp('/checkout');

    await screen.findByTestId('error-message');
    expect(screen.queryByTestId('place-order-button')).not.toBeInTheDocument();

    api['/api/cart-items?expand=product'] = workingApi['/api/cart-items?expand=product'];
    await user.click(screen.getByTestId('try-again-button'));

    expect(await screen.findByTestId('place-order-button')).toBeInTheDocument();
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('shows an error on the tracking page instead of a blank page', async () => {
    api['/api/orders/order-1?expand=products'] = { status: 500 };
    renderApp(`/tracking/order-1/${product.id}`);

    await screen.findByTestId('error-message');

    api['/api/orders/order-1?expand=products'] = workingApi['/api/orders/order-1?expand=products'];
    await user.click(screen.getByTestId('try-again-button'));

    expect(await screen.findByText(product.name)).toBeInTheDocument();
  });

  it('does not offer Try again for an order that does not exist', async () => {
    api['/api/orders/order-1?expand=products'] = { status: 404 };
    renderApp(`/tracking/order-1/${product.id}`);

    expect(await screen.findByTestId('package-not-found')).toBeInTheDocument();
    expect(screen.queryByTestId('try-again-button')).not.toBeInTheDocument();
  });

  it('shows the not found message for a product that is not in the order', async () => {
    renderApp('/tracking/order-1/other-product');

    expect(await screen.findByTestId('package-not-found')).toBeInTheDocument();
  });

  it('tells the user when a change fails to save', async () => {
    renderApp();
    await screen.findByTestId('product-container');

    await act(async () => {
      await axios.post('/api/cart-items', {}).catch(() => {});
    });

    expect(screen.getByTestId('error-message'))
      .toHaveTextContent("Your change wasn't saved");

    await user.click(screen.getByTestId('try-again-button'));

    expect(await screen.findByTestId('product-container')).toBeInTheDocument();
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('repeats a failed add to cart when Try again is clicked', async () => {
    renderApp();
    await user.click(await screen.findByTestId('add-to-cart-button'));

    expect(await screen.findByTestId('error-message'))
      .toHaveTextContent("Your change wasn't saved");
    expect(screen.getByTestId('add-to-cart-button')).toBeEnabled();

    api['/api/cart-items'] = { data: {} };
    await user.click(screen.getByTestId('try-again-button'));

    await waitFor(() => expect(screen.getByText('Added')).toHaveStyle({ opacity: '1' }));
    expect(requests.filter((request) => request === 'post /api/cart-items')).toHaveLength(2);
    // The action was repeated without reloading the page
    expect(requests.filter((request) => request === 'get /api/products')).toHaveLength(1);
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('repeats a failed order when Try again is clicked', async () => {
    api['/api/payment-summary'] = {
      data: { ...workingApi['/api/payment-summary'].data, totalItems: 1 }
    };
    renderApp('/checkout');
    await user.click(await screen.findByTestId('place-order-button'));

    await screen.findByTestId('error-message');

    api['/api/orders'] = { data: {} };
    await user.click(screen.getByTestId('try-again-button'));

    expect(await screen.findByText(product.name)).toBeInTheDocument();
    expect(requests.filter((request) => request === 'post /api/orders')).toHaveLength(2);
  });
});

describe('LoadingMessage', () => {
  it('explains the wait when loading is slow', () => {
    vi.useFakeTimers();
    render(<LoadingMessage />);

    expect(screen.queryByTestId('slow-loading-message')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByTestId('slow-loading-message'))
      .toHaveTextContent('The demo server is waking up');
    vi.useRealTimers();
  });
});
