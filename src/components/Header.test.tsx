import { it, expect, describe, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { Header } from './Header';

function CurrentUrl() {
  const { pathname, search } = useLocation();
  return <div data-testid="current-url">{pathname + search}</div>;
}

describe('Header component', () => {
  let cart;

  beforeEach(() => {
    cart = [{
      productId: 'e43638ce-6aa0-4b85-b27f-e1d07eb678c6',
      quantity: 2,
      deliveryOptionId: '1'
    }, {
      productId: '15b6fc6f-327a-4ec4-896f-486349e85a3d',
      quantity: 3,
      deliveryOptionId: '2'
    }];
  });

  it('displays the header correctly', () => {
    render(
      <MemoryRouter>
        <Header cart={cart} />
      </MemoryRouter>
    );

    const logo = screen.getByTestId('logo');
    expect(logo.getAttribute('src')).toContain('logo-white.webp');

    const mobileLogo = screen.getByTestId('mobile-logo');
    expect(mobileLogo.getAttribute('srcset')).toContain('mobile-logo-white.png');

    expect(screen.getByTestId('header-search-bar')).toBeInTheDocument();
    expect(screen.getByTestId('header-search-button')).toBeInTheDocument();

    const ordersLink = screen.getByTestId('header-orders-link');
    expect(ordersLink).toHaveTextContent('Orders');
    expect(ordersLink).toHaveAttribute('href', '/orders');

    const cartLink = screen.getByTestId('header-cart-link');
    expect(cartLink).toHaveTextContent('Cart');
    expect(cartLink).toHaveTextContent('5');
    expect(cartLink).toHaveAttribute('href', '/checkout');
  });

  it('searches when pressing Enter and encodes the search text', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Header cart={cart} />
        <CurrentUrl />
      </MemoryRouter>
    );

    await user.type(screen.getByTestId('header-search-bar'), 'socks & shoes{Enter}');

    expect(screen.getByTestId('current-url'))
      .toHaveTextContent('/?search=socks%20%26%20shoes');
  });

  it('clears the search text when clicking the logo', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/?search=socks']}>
        <Header cart={cart} />
        <CurrentUrl />
      </MemoryRouter>
    );

    const searchBar = screen.getByTestId('header-search-bar');
    expect(searchBar).toHaveValue('socks');

    await user.click(screen.getByTestId('logo'));

    expect(searchBar).toHaveValue('');
    expect(screen.getByTestId('current-url')).toHaveTextContent(/^\/$/);
  });
});