import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { User } from '@supabase/supabase-js';
import { ProductPage } from './ProductPage';
import { AuthContext, type Auth } from '../../hooks/useAuth';
import type { Review } from '../../types/store';

const product = {
  id: 'e43638ce-6aa0-4b85-b27f-e1d07eb678c6',
  image: 'images/products/gray-hand-knit-wool-socks.jpg',
  name: 'Gray Hand Knit Wool Socks',
  rating: { stars: 4.5, count: 89 },
  priceCents: 1090,
  keywords: ['socks'],
  deletedAt: null
};

const productPath = `/api/products/${product.id}`;
const reviewsPath = `${productPath}/reviews`;

const review = (fields: Partial<Review>): Review => ({
  id: 'b8a4d2a6-3c55-4b1f-9a3e-2f1d6c0e7a11',
  productId: product.id,
  authorName: 'ja***',
  stars: 5,
  text: 'Warm and soft.',
  createdAt: '2025-05-18T09:00:00.000Z',
  updatedAt: '2025-05-18T09:00:00.000Z',
  isMine: false,
  ...fields
});

const newestReview = review({ id: 'newest', authorName: 'Customer', stars: 3, text: null, createdAt: '2025-06-02T09:00:00.000Z' });
const olderReview = review({ id: 'older' });

describe('ProductPage component', () => {
  const originalAdapter = axios.defaults.adapter;
  let api: Record<string, { status?: number; data?: unknown }>;
  let requests: { request: string; body?: unknown }[];
  let loadCart: () => Promise<void>;
  let onRetry: () => void;
  let user: ReturnType<typeof userEvent.setup>;

  const loggedIn = (fields: Partial<Auth> = {}): Auth => ({
    user: { id: 'user-id', email: 'jane.doe@example.com' } as User, isAdmin: false, logOut: vi.fn(), ...fields
  });

  const renderProductPage = (auth: Auth | null = loggedIn({ user: null })) => render(
    <MemoryRouter initialEntries={[`/products/${product.id}`]}>
      <AuthContext value={auth}>
        <Routes>
          <Route path="products/:productId" element={<ProductPage cart={[]} loadCart={loadCart} onRetry={onRetry} />} />
        </Routes>
      </AuthContext>
    </MemoryRouter>
  );

  const requestsTo = (request: string) => requests.filter((sent) => sent.request === request);

  beforeEach(() => {
    api = {
      [`get ${productPath}`]: { data: product },
      [`get ${reviewsPath}`]: { data: { reviews: [newestReview, olderReview], canReview: false } },
      'post /api/cart-items': { status: 201, data: {} }
    };
    requests = [];
    loadCart = vi.fn(async () => {});
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

  it('shows the product and adds it to the cart', async () => {
    renderProductPage();

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(product.name);
    expect(screen.getByRole('img', { name: product.name })).toHaveAttribute('src', product.image);
    expect(screen.getByRole('img', { name: '4.5 out of 5 stars' })).toBeInTheDocument();
    expect(screen.getByText('89')).toBeInTheDocument();
    expect(screen.getByTestId('product-price')).toHaveTextContent('$10.90');

    await user.selectOptions(screen.getByTestId('quantity-select-selector'), '2');
    await user.click(screen.getByTestId('add-to-cart-button'));

    expect(requestsTo('post /api/cart-items')[0].body).toEqual({ productId: product.id, quantity: 2 });
    expect(loadCart).toHaveBeenCalled();
  });

  it('shows a deleted product as no longer available, without Add to Cart', async () => {
    api[`get ${productPath}`] = { data: { ...product, deletedAt: '2025-06-20T10:00:00.000Z' } };
    renderProductPage();

    expect(await screen.findByTestId('product-unavailable')).toHaveTextContent('No longer available');
    expect(screen.queryByTestId('add-to-cart-button')).not.toBeInTheDocument();
  });

  it('says so when the product does not exist, without offering Try again', async () => {
    api[`get ${productPath}`] = { status: 404, data: { error: 'Product not found' } };
    renderProductPage();

    expect(await screen.findByTestId('product-not-found')).toBeInTheDocument();
    expect(screen.queryByTestId('error-message-button')).not.toBeInTheDocument();
  });

  it('shows an error with Try again when the product fails to load', async () => {
    api[`get ${productPath}`] = { status: 503 };
    renderProductPage();

    await user.click(await screen.findByTestId('error-message-button'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('lists the reviews in the order the API sends them, newest first', async () => {
    renderProductPage();

    const reviews = await screen.findAllByTestId('review');
    expect(reviews).toHaveLength(2);
    expect(reviews[0]).toHaveTextContent('Customer · June 2, 2025');
    expect(within(reviews[0]).getByRole('img', { name: '3 out of 5 stars' })).toBeInTheDocument();
    expect(reviews[1]).toHaveTextContent('ja*** · May 18, 2025');
    expect(reviews[1]).toHaveTextContent('Warm and soft.');
    for (const shownReview of reviews) {
      expect(shownReview).toHaveTextContent('Verified purchase');
      expect(within(shownReview).queryByRole('button')).not.toBeInTheDocument();
    }
  });

  it('says so when there are no written reviews yet', async () => {
    api[`get ${reviewsPath}`] = { data: { reviews: [], canReview: false } };
    renderProductPage();

    expect(await screen.findByTestId('no-reviews-message')).toBeInTheDocument();
  });

  it('asks a guest to log in to review', async () => {
    renderProductPage();

    const message = await screen.findByTestId('reviews-login-message');
    expect(within(message).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(message).toHaveTextContent('Only customers who ordered this product can review it.');
    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
  });

  it('only explains who can review when accounts are off', async () => {
    renderProductPage(null);

    const message = await screen.findByTestId('reviews-login-message');
    expect(within(message).queryByRole('link')).not.toBeInTheDocument();
  });

  it('tells a user who has not ordered the product why they cannot review it', async () => {
    renderProductPage(loggedIn());

    expect(await screen.findByTestId('reviews-not-ordered-message'))
      .toHaveTextContent('Only customers who ordered this product can review it.');
    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
  });

  it('lets a customer who ordered the product write a review, and updates the rating', async () => {
    api[`get ${reviewsPath}`] = { data: { reviews: [olderReview], canReview: true } };
    api[`post ${reviewsPath}`] = { status: 201, data: {} };
    renderProductPage(loggedIn());

    await user.click(await screen.findByRole('radio', { name: '4 stars' }));
    await user.type(screen.getByTestId('review-text-input'), 'Cozy');
    expect(screen.getByText('4/500 characters')).toBeInTheDocument();

    const myReview = review({ id: 'mine', stars: 4, text: 'Cozy', isMine: true, createdAt: '2025-06-03T09:00:00.000Z' });
    api[`get ${reviewsPath}`] = { data: { reviews: [myReview, olderReview], canReview: true } };
    api[`get ${productPath}`] = { data: { ...product, rating: { stars: 4.5, count: 90 } } };
    await user.click(screen.getByTestId('review-save-button'));

    expect(requestsTo(`post ${reviewsPath}`)[0].body).toEqual({ stars: 4, text: 'Cozy' });
    await waitFor(() => expect(screen.queryByTestId('review-form')).not.toBeInTheDocument());
    expect(screen.getAllByTestId('review')[0]).toHaveTextContent('ja*** (you)');
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('needs a star rating before posting a review', async () => {
    api[`get ${reviewsPath}`] = { data: { reviews: [], canReview: true } };
    renderProductPage(loggedIn());

    await user.type(await screen.findByTestId('review-text-input'), 'Cozy');
    await user.click(screen.getByTestId('review-save-button'));

    expect(requestsTo(`post ${reviewsPath}`)).toEqual([]);
  });

  it('lets the author edit their review, starting from what they wrote', async () => {
    const myReview = review({ isMine: true });
    api[`get ${reviewsPath}`] = { data: { reviews: [myReview], canReview: true } };
    api[`put ${reviewsPath}/${myReview.id}`] = { data: {} };
    renderProductPage(loggedIn());

    await user.click(await screen.findByTestId('review-edit-button'));

    expect(screen.getByRole('radio', { name: '5 stars' })).toBeChecked();
    expect(screen.getByTestId('review-text-input')).toHaveValue('Warm and soft.');
    await user.click(screen.getByRole('radio', { name: '2 stars' }));
    await user.click(screen.getByTestId('review-save-button'));

    await waitFor(() => expect(screen.queryByTestId('review-form')).not.toBeInTheDocument());
    expect(requestsTo(`put ${reviewsPath}/${myReview.id}`)[0].body).toEqual({ stars: 2, text: 'Warm and soft.' });
  });

  it("lets an admin delete anyone's review after confirming", async () => {
    api[`delete ${reviewsPath}/${olderReview.id}`] = { status: 204 };
    renderProductPage(loggedIn({ isAdmin: true }));

    const [, reviewByOther] = await screen.findAllByTestId('review');
    expect(within(reviewByOther).queryByTestId('review-edit-button')).not.toBeInTheDocument();
    await user.click(within(reviewByOther).getByTestId('review-delete-button'));
    expect(within(reviewByOther).getByRole('button', { name: 'Keep' })).toHaveFocus();
    await user.click(within(reviewByOther).getByTestId('review-confirm-delete-button'));

    await waitFor(() => expect(requestsTo(`get ${reviewsPath}`)).toHaveLength(2));
    expect(requestsTo(`delete ${reviewsPath}/${olderReview.id}`)).toHaveLength(1);
    expect(requestsTo(`get ${productPath}`)).toHaveLength(2);
  });

  it('shows an error with Try again when the reviews fail to load', async () => {
    api[`get ${reviewsPath}`] = { status: 503 };
    renderProductPage();

    expect(await screen.findByTestId('error-message')).toHaveTextContent("We couldn't load the reviews");
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(product.name);

    api[`get ${reviewsPath}`] = { data: { reviews: [olderReview], canReview: false } };
    await user.click(screen.getByTestId('error-message-button'));

    expect(await screen.findByTestId('review')).toHaveTextContent('Warm and soft.');
  });
});
