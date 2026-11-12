import { it, expect, describe, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import { CheckoutPage } from './CheckoutPage';

vi.mock('axios');

describe('CheckoutPage component', () => {
  let loadCart;
  let cart;
  let deliveryOptions;
  let paymentSummary;
  let featuredCoupon;

  beforeEach(() => {
    loadCart = vi.fn();
    featuredCoupon = { code: 'WELCOME10', percentOff: 10 };

    cart = [{
      productId: 'e43638ce-6aa0-4b85-b27f-e1d07eb678c6',
      quantity: 2,
      deliveryOptionId: '1',
      product: {
        id: "e43638ce-6aa0-4b85-b27f-e1d07eb678c6",
        image: "images/products/gray-hand-knit-wool-socks.jpg",
        name: "Gray Hand Knit Wool Socks",
        rating: {
          stars: 4.5,
          count: 87
        },
        priceCents: 1090,
        keywords: ["socks", "sports", "apparel"]
      }
    }, {
      productId: '15b6fc6f-327a-4ec4-896f-486349e85a3d',
      quantity: 1,
      deliveryOptionId: '2',
      product: {
        id: "15b6fc6f-327a-4ec4-896f-486349e85a3d",
        image: "images/products/intermediate-composite-basketball.jpg",
        name: "Intermediate Size Basketball",
        rating: {
          stars: 4,
          count: 127
        },
        priceCents: 2095,
        keywords: ["sports", "basketballs"]
      }
    }];

    deliveryOptions = [{
      id: '1',
      deliveryDays: 7,
      priceCents: 0,
      estimatedDeliveryTimeMs: 1747597994451,
    }, {
      id: '2',
      deliveryDays: 3,
      priceCents: 499,
      estimatedDeliveryTimeMs: 1747252394451,
    }, {
      id: '3',
      deliveryDays: 1,
      priceCents: 999,
      estimatedDeliveryTimeMs: 1747079594451,
    }];

    paymentSummary = {
      totalItems: 3,
      productCostCents: 4275,
      shippingCostCents: 499,
      totalCostBeforeTaxCents: 4774,
      taxCents: 477,
      totalCostCents: 5251,
      coupon: null,
      discountCents: 0
    };

    axios.get.mockImplementation(async (url) => {
      if (url === '/api/delivery-options?expand=estimatedDeliveryTime') {
        return { data: deliveryOptions };
      }
      if (url === '/api/payment-summary') {
        return { data: paymentSummary };
      }
      if (url === '/api/featured-coupon') {
        return { data: featuredCoupon };
      }
      if (url === '/api/coupons/welcome10') {
        return { data: { code: 'WELCOME10', percentOff: 10 } };
      }
      if (url === '/api/payment-summary?couponCode=WELCOME10') {
        return { data: { ...paymentSummary, coupon: { code: 'WELCOME10', percentOff: 10 }, discountCents: 428, totalCostCents: 4781 } };
      }
    });
  });

  it('displays the page correctly', async () => {
    render(
      <MemoryRouter>
        <CheckoutPage cart={cart} loadCart={loadCart} />
      </MemoryRouter>
    );

    const paymentSummary = await screen.findByTestId('payment-summary-product-cost');

    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      '/api/delivery-options?expand=estimatedDeliveryTime'
    );
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      '/api/payment-summary'
    );

    // OrderSummary and PaymentSummary have their own, more detailed tests
    expect(screen.getByText('Review your order')).toBeInTheDocument();
    expect(
      screen.getByText('Gray Hand Knit Wool Socks')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Intermediate Size Basketball')
    ).toBeInTheDocument();

    expect(paymentSummary).toBeInTheDocument();
    expect(screen.getByText('Payment Summary')).toBeInTheDocument();
    expect(screen.getByTestId('payment-summary-product-cost'))
      .toHaveTextContent('Items (3):');
    expect(screen.getByTestId('payment-summary-shipping-cost'))
      .toHaveTextContent('$4.99');
  });

  it('shows an empty cart message with a link back to the products', async () => {
    render(
      <MemoryRouter>
        <CheckoutPage cart={[]} cartStatus="ready" loadCart={loadCart} />
      </MemoryRouter>
    );

    expect(await screen.findByTestId('empty-cart-message'))
      .toHaveTextContent('Your cart is empty');
    expect(screen.getByRole('link', { name: 'Browse products' })).toHaveAttribute('href', '/');
    expect(screen.queryByTestId('place-order-button')).not.toBeInTheDocument();
  });

  it('suggests the coupon the API features, or none', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <CheckoutPage cart={cart} cartStatus="ready" loadCart={loadCart} />
      </MemoryRouter>
    );
    expect(await screen.findByTestId('coupon-hint')).toHaveTextContent('Use WELCOME10 for 10% off your items.');
    unmount();

    featuredCoupon = null;
    render(
      <MemoryRouter>
        <CheckoutPage cart={cart} cartStatus="ready" loadCart={loadCart} />
      </MemoryRouter>
    );
    await screen.findByTestId('coupon-input');
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/featured-coupon'));
    expect(screen.queryByTestId('coupon-hint')).not.toBeInTheDocument();
  });

  it('applies a coupon, and the API works out the new totals', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CheckoutPage cart={cart} cartStatus="ready" loadCart={loadCart} />
      </MemoryRouter>
    );

    await user.type(await screen.findByTestId('coupon-input'), ' welcome10 ');
    await user.click(screen.getByTestId('coupon-apply-button'));

    expect(axios.get).toHaveBeenCalledWith('/api/coupons/welcome10');
    expect(axios.get).toHaveBeenLastCalledWith('/api/payment-summary?couponCode=WELCOME10');
    expect(await screen.findByTestId('payment-summary-discount')).toHaveTextContent('-$4.28');
    expect(screen.getByTestId('payment-summary-total')).toHaveTextContent('$47.81');

    await user.click(screen.getByTestId('coupon-remove-button'));
    await waitFor(() => expect(screen.queryByTestId('payment-summary-discount')).not.toBeInTheDocument());
    expect(axios.get).toHaveBeenLastCalledWith('/api/payment-summary');
  });

  it('drops a coupon that stopped working since it was applied', async () => {
    const user = userEvent.setup();
    const getFromApi = axios.get.getMockImplementation();
    axios.get.mockImplementation(async (url) => {
      if (url === '/api/payment-summary?couponCode=WELCOME10') {
        throw Object.assign(new Error('Request failed with status code 400'), {
          isAxiosError: true, response: { status: 400, data: { error: 'The coupon WELCOME10 has expired.' } }
        });
      }
      return getFromApi(url);
    });
    axios.isAxiosError.mockImplementation((error) => Boolean(error?.isAxiosError));
    render(
      <MemoryRouter>
        <CheckoutPage cart={cart} cartStatus="ready" loadCart={loadCart} />
      </MemoryRouter>
    );

    await user.type(await screen.findByTestId('coupon-input'), 'welcome10');
    await user.click(screen.getByTestId('coupon-apply-button'));

    await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith('/api/payment-summary'));
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    expect(screen.queryByTestId('coupon-applied')).not.toBeInTheDocument();
  });
});
