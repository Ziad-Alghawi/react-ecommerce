import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { User } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import { AdminPage } from './AdminPage';
import { AuthContext } from '../../hooks/useAuth';

const socks = {
  id: 'e43638ce-6aa0-4b85-b27f-e1d07eb678c6',
  image: 'images/products/gray-hand-knit-wool-socks.jpg',
  name: 'Gray Hand Knit Wool Socks',
  rating: { stars: 4.5, count: 87 },
  priceCents: 1090,
  stock: 20,
  keywords: ['socks', 'wool'],
  category: 'Clothing'
};

const basketball = {
  id: '15b6fc6f-327a-4ec4-896f-486349e85a3d',
  image: 'images/products/intermediate-composite-basketball.jpg',
  name: 'Intermediate Size Basketball',
  rating: { stars: 4, count: 127 },
  priceCents: 2095,
  stock: 2,
  keywords: ['sports', 'basketballs'],
  category: 'Sports'
};

const welcome = { id: 'c1f6a8a2-4b7e-4f0e-9d3b-1a2b3c4d5e6f', code: 'WELCOME10', percentOff: 10, expiresAt: null, active: true };
const oldSale = { id: 'd2a7b9c3-5c8f-4a1f-8e4c-2b3c4d5e6f70', code: 'OLDSALE', percentOff: 30, expiresAt: '2020-01-31T22:59:59.999Z', active: true };
const paused = { id: 'e3b8cad4-6d90-4b2a-9f5d-3c4d5e6f7081', code: 'PAUSED', percentOff: 5, expiresAt: null, active: false };

const workingApi = {
  'get /api/products': { data: [socks, basketball] },
  'get /api/admin/images': { data: [basketball.image, socks.image] },
  'get /api/products/categories': { data: ['Clothing', 'Accessories', 'Sports'] },
  'post /api/admin/products': { status: 201, data: {} },
  [`put /api/admin/products/${socks.id}`]: { data: {} },
  [`delete /api/admin/products/${socks.id}`]: { status: 204 },
  'get /api/admin/coupons': { data: [welcome, oldSale, paused] },
  'post /api/admin/coupons': { status: 201, data: {} },
  [`put /api/admin/coupons/${welcome.id}`]: { data: {} }
};

describe('AdminPage component', () => {
  const originalAdapter = axios.defaults.adapter;
  let api: Record<string, { status?: number; data?: unknown }>;
  let requests: { request: string; body?: unknown }[];
  let onRetry: () => void;
  let user: ReturnType<typeof userEvent.setup>;

  const renderAdminPage = (loggedInUser: User | null = { id: 'admin-id' } as User) => render(
    <MemoryRouter>
      <AuthContext value={{ user: loggedInUser, isAdmin: true, logOut: vi.fn() }}>
        <AdminPage cart={[]} onRetry={onRetry} />
      </AuthContext>
    </MemoryRouter>
  );

  const requestsTo = (request: string) => requests.filter((sent) => sent.request === request);

  beforeEach(() => {
    api = { ...workingApi };
    requests = [];
    onRetry = vi.fn();
    user = userEvent.setup();

    axios.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const request = `${config.method} ${config.url}`;
      requests.push({ request, body: config.data && JSON.parse(config.data) });
      const { status = 200, data } = api[request] ?? { status: 500 };
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

  it('asks a guest to log in, without calling the admin API', () => {
    renderAdminPage(null);

    const message = screen.getByTestId('admin-login-message');
    expect(within(message).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(requests).toEqual([]);
  });

  it('tells a user who is not an admin that the page is only for admins', async () => {
    api['get /api/admin/images'] = { status: 403, data: { error: 'Only admins can do this.' } };
    renderAdminPage();

    expect(await screen.findByTestId('admin-forbidden-message')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an error with Try again when loading fails', async () => {
    api['get /api/products'] = { status: 503 };
    renderAdminPage();

    await user.click(await screen.findByTestId('error-message-button'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('lists the products', async () => {
    renderAdminPage();

    const rows = await screen.findAllByTestId('admin-product-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Gray Hand Knit Wool Socks');
    expect(rows[0]).toHaveTextContent('$10.90');
    expect(rows[0]).toHaveTextContent('Clothing');
    expect(rows[0]).toHaveTextContent('20 in stock');
    expect(rows[1]).toHaveTextContent('Only 2 left');
    expect(rows[0]).toHaveTextContent('socks, wool');
    expect(screen.getByRole('table', { name: '2 products in the store' })).toBeInTheDocument();
  });

  it('adds a product with one of the store images', async () => {
    renderAdminPage();
    await user.click(await screen.findByTestId('admin-add-button'));

    const form = screen.getByTestId('admin-product-form');
    expect(within(form).getAllByRole('radio')).toHaveLength(2);
    await user.type(screen.getByTestId('admin-name-input'), 'Plaid Wool Scarf');
    await user.type(screen.getByTestId('admin-price-input'), '15.5');
    await user.type(screen.getByTestId('admin-stock-input'), '40');
    await user.type(screen.getByTestId('admin-keywords-input'), ' scarves,  plaid ,');
    await user.selectOptions(screen.getByTestId('admin-category-select'), 'Accessories');
    await user.click(within(form).getByRole('radio', { name: 'gray hand knit wool socks' }));
    await user.click(screen.getByTestId('admin-save-button'));

    await waitFor(() => expect(screen.queryByTestId('admin-product-form')).not.toBeInTheDocument());
    expect(requestsTo('post /api/admin/products')).toEqual([{
      request: 'post /api/admin/products',
      body: { name: 'Plaid Wool Scarf', priceCents: 1550, image: socks.image, category: 'Accessories', stock: 40, keywords: ['scarves', 'plaid'] }
    }]);
    expect(requestsTo('get /api/products')).toHaveLength(2);
  });

  it('needs an image and a category before adding a product', async () => {
    renderAdminPage();
    await user.click(await screen.findByTestId('admin-add-button'));

    await user.type(screen.getByTestId('admin-name-input'), 'Plaid Wool Scarf');
    await user.type(screen.getByTestId('admin-price-input'), '15');
    await user.type(screen.getByTestId('admin-stock-input'), '5');
    await user.click(screen.getByTestId('admin-save-button'));
    await user.click(screen.getByRole('radio', { name: 'gray hand knit wool socks' }));
    expect(screen.getByTestId('admin-category-select')).toBeInvalid();
    await user.click(screen.getByTestId('admin-save-button'));

    expect(requestsTo('post /api/admin/products')).toEqual([]);
    expect(screen.getByTestId('admin-product-form')).toBeInTheDocument();
  });

  it('edits a product starting from its current details', async () => {
    renderAdminPage();
    await user.click(await screen.findByRole('button', { name: 'Edit Gray Hand Knit Wool Socks' }));

    expect(screen.getByTestId('admin-name-input')).toHaveValue(socks.name);
    expect(screen.getByTestId('admin-price-input')).toHaveValue(10.9);
    expect(screen.getByTestId('admin-keywords-input')).toHaveValue('socks, wool');
    expect(screen.getByRole('radio', { name: 'gray hand knit wool socks' })).toBeChecked();
    expect(screen.getByTestId('admin-category-select')).toHaveValue('Clothing');
    expect(screen.getByTestId('admin-stock-input')).toHaveValue(20);

    await user.clear(screen.getByTestId('admin-price-input'));
    await user.type(screen.getByTestId('admin-price-input'), '12.99');
    await user.click(screen.getByTestId('admin-save-button'));

    await waitFor(() => expect(screen.queryByTestId('admin-product-form')).not.toBeInTheDocument());
    expect(requestsTo(`put /api/admin/products/${socks.id}`)[0].body).toEqual({
      name: socks.name, priceCents: 1299, image: socks.image, category: 'Clothing', stock: 20, keywords: ['socks', 'wool']
    });
  });

  it('closes the form without saving on Cancel', async () => {
    renderAdminPage();
    await user.click(await screen.findByRole('button', { name: 'Edit Gray Hand Knit Wool Socks' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByTestId('admin-product-form')).not.toBeInTheDocument();
    expect(requests.map(({ request }) => request).filter((request) => !request.startsWith('get'))).toEqual([]);
  });

  it('asks before deleting a product', async () => {
    renderAdminPage();
    await user.click(await screen.findByRole('button', { name: 'Delete Gray Hand Knit Wool Socks' }));

    const confirmation = screen.getByRole('group', { name: 'Delete Gray Hand Knit Wool Socks?' });
    expect(within(confirmation).getByRole('button', { name: 'Keep' })).toHaveFocus();
    await user.click(within(confirmation).getByRole('button', { name: 'Keep' }));
    expect(requestsTo(`delete /api/admin/products/${socks.id}`)).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Delete Gray Hand Knit Wool Socks' }));
    await user.click(screen.getByTestId('admin-confirm-delete-button'));

    await waitFor(() => expect(requestsTo('get /api/products')).toHaveLength(2));
    expect(requestsTo(`delete /api/admin/products/${socks.id}`)).toHaveLength(1);
  });

  it('does not delete on a double click of Delete', async () => {
    renderAdminPage();
    await user.dblClick(await screen.findByRole('button', { name: 'Delete Gray Hand Knit Wool Socks' }));

    expect(screen.getByTestId('admin-confirm-delete-button')).toBeInTheDocument();
    expect(requestsTo(`delete /api/admin/products/${socks.id}`)).toEqual([]);
  });

  it('lists the coupons with when they expire and whether they work', async () => {
    renderAdminPage();

    const rows = await screen.findAllByTestId('admin-coupon-row');
    expect(rows.map((row) => [...row.querySelectorAll('td')].slice(0, 4).map((cell) => cell.textContent))).toEqual([
      ['WELCOME10', '10% off', 'Never', 'Active'],
      ['OLDSALE', '30% off', 'January 31, 2020', 'Expired'],
      ['PAUSED', '5% off', 'Never', 'Off']
    ]);
  });

  it('adds a coupon that works until the end of its last day', async () => {
    renderAdminPage();
    await user.click(await screen.findByTestId('admin-add-coupon-button'));

    await user.type(screen.getByTestId('admin-coupon-code-input'), 'spring25');
    await user.type(screen.getByTestId('admin-coupon-percent-input'), '25');
    await user.type(screen.getByTestId('admin-coupon-expiry-input'), '2099-06-30');
    await user.click(screen.getByTestId('admin-coupon-save-button'));

    await waitFor(() => expect(screen.queryByTestId('admin-coupon-form')).not.toBeInTheDocument());
    expect(requestsTo('post /api/admin/coupons')[0].body).toEqual({
      code: 'spring25', percentOff: 25, expiresAt: dayjs('2099-06-30').endOf('day').toISOString(), active: true
    });
    expect(requestsTo('get /api/admin/coupons')).toHaveLength(2);
  });

  it('turns a coupon off, keeping its other details', async () => {
    renderAdminPage();
    await user.click(await screen.findByRole('button', { name: 'Edit WELCOME10' }));

    expect(screen.getByTestId('admin-coupon-code-input')).toHaveValue('WELCOME10');
    expect(screen.getByTestId('admin-coupon-percent-input')).toHaveValue(10);
    expect(screen.getByTestId('admin-coupon-expiry-input')).toHaveValue('');
    await user.click(screen.getByTestId('admin-coupon-active-input'));
    await user.click(screen.getByTestId('admin-coupon-save-button'));

    await waitFor(() => expect(screen.queryByTestId('admin-coupon-form')).not.toBeInTheDocument());
    expect(requestsTo(`put /api/admin/coupons/${welcome.id}`)[0].body).toEqual({
      code: 'WELCOME10', percentOff: 10, expiresAt: null, active: false
    });
  });
});
