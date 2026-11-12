import { it, expect, describe, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { PaymentSummary } from './PaymentSummary';
import axios from 'axios';
import userEvent from '@testing-library/user-event';

vi.mock('axios');

describe('PaymentSummary', () => {
  let paymentSummary;
  let loadCart;
  let onCouponChange;
  let user;

  beforeEach(() => {
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

    loadCart = vi.fn();
    onCouponChange = vi.fn();
    user = userEvent.setup();
  });

  it('disables the place order button when the cart is empty', () => {
    render(
      <MemoryRouter>
        <PaymentSummary
          paymentSummary={{ ...paymentSummary, totalItems: 0 }}
          couponCode={null}
          onCouponChange={onCouponChange}
          loadCart={loadCart}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId('place-order-button')).toBeDisabled();
  });

  it('disables the button and shows a spinner while placing the order', async () => {
    let finishRequest;
    axios.post.mockReturnValueOnce(new Promise((resolve) => { finishRequest = resolve; }));
    render(
      <MemoryRouter>
        <PaymentSummary paymentSummary={paymentSummary} couponCode={null} onCouponChange={onCouponChange} loadCart={loadCart} />
      </MemoryRouter>
    );

    const placeOrderButton = screen.getByTestId('place-order-button');
    await user.click(placeOrderButton);

    expect(placeOrderButton).toBeDisabled();
    expect(within(placeOrderButton).getByTestId('button-spinner')).toBeInTheDocument();

    await act(async () => finishRequest({}));
    expect(loadCart).toHaveBeenCalled();
  });

  it('displays the correct details', async () => {
    render(
      <MemoryRouter>
        <PaymentSummary paymentSummary={paymentSummary} couponCode={null} onCouponChange={onCouponChange} loadCart={loadCart} />
      </MemoryRouter>
    );

    expect(
      screen.getByText('Items (3):')
    ).toBeInTheDocument();

    expect(
      within(screen.getByTestId('payment-summary-product-cost')).getByText('$42.75')
    ).toBeInTheDocument();

    expect(
      screen.getByTestId('payment-summary-shipping-cost')
    ).toHaveTextContent('$4.99');

    expect(
      screen.getByTestId('payment-summary-total-before-tax')
    ).toHaveTextContent('$47.74');

    expect(
      screen.getByTestId('payment-summary-tax')
    ).toHaveTextContent('$4.77');

    expect(
      screen.getByTestId('payment-summary-total')
    ).toHaveTextContent('$52.51');
    expect(screen.queryByTestId('payment-summary-discount')).not.toBeInTheDocument();
  });

  it('shows the coupon discount and sends the code with either way of paying', async () => {
    axios.get.mockResolvedValueOnce({ data: { cardPayment: true } });
    axios.post.mockResolvedValue({ data: { url: 'https://checkout.stripe.com/c/pay/cs_test_1' } });
    vi.stubGlobal('location', { ...window.location, assign: vi.fn() });
    const discounted = {
      ...paymentSummary, coupon: { code: 'WELCOME10', percentOff: 10 }, discountCents: 428,
      totalCostBeforeTaxCents: 4346, taxCents: 435, totalCostCents: 4781
    };
    render(
      <MemoryRouter>
        <PaymentSummary paymentSummary={discounted} couponCode="WELCOME10" onCouponChange={onCouponChange} loadCart={loadCart} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('payment-summary-discount')).toHaveTextContent('Discount (WELCOME10):-$4.28');
    expect(screen.getByTestId('payment-summary-total')).toHaveTextContent('$47.81');
    expect(screen.getByTestId('coupon-applied')).toHaveTextContent('WELCOME10 applied: 10% off your items');

    await user.click(await screen.findByTestId('pay-with-card-button'));
    expect(axios.post).toHaveBeenCalledWith('/api/stripe/checkout-sessions', { couponCode: 'WELCOME10' });
    await user.click(screen.getByTestId('place-order-button'));
    expect(axios.post).toHaveBeenCalledWith('/api/orders', { couponCode: 'WELCOME10' });

    await user.click(screen.getByTestId('coupon-remove-button'));
    expect(onCouponChange).toHaveBeenCalledWith(null);
    vi.unstubAllGlobals();
  });

  it('only offers paying on delivery when card payment is off', async () => {
    axios.get.mockResolvedValueOnce({ data: { cardPayment: false } });
    render(
      <MemoryRouter>
        <PaymentSummary paymentSummary={paymentSummary} couponCode={null} onCouponChange={onCouponChange} loadCart={loadCart} />
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/stripe/config'));
    expect(screen.getByTestId('place-order-button')).toHaveTextContent('Place your order');
    expect(screen.queryByTestId('pay-with-card-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('card-test-note')).not.toBeInTheDocument();
  });

  it('pays with card on Stripe, with the test card shown', async () => {
    axios.get.mockResolvedValueOnce({ data: { cardPayment: true } });
    axios.post.mockResolvedValueOnce({ data: { url: 'https://checkout.stripe.com/c/pay/cs_test_1' } });
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    render(
      <MemoryRouter>
        <PaymentSummary paymentSummary={paymentSummary} couponCode={null} onCouponChange={onCouponChange} loadCart={loadCart} />
      </MemoryRouter>
    );

    const payWithCardButton = await screen.findByTestId('pay-with-card-button');
    expect(screen.getByTestId('card-test-note')).toHaveTextContent('Test mode: use card 4242 4242 4242 4242');
    expect(screen.getByTestId('place-order-button')).toHaveTextContent('Pay on delivery');

    await user.click(payWithCardButton);

    // The cart and prices stay on the server, so nothing is sent
    expect(axios.post).toHaveBeenCalledWith('/api/stripe/checkout-sessions', { couponCode: null });
    expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_1');
    vi.unstubAllGlobals();
  });

  it('places an order and goes to the orders page', async () => {
    function Location() {
      const location = useLocation();
      return <div data-testid="url-path">{location.pathname}</div>;
    }

    render(
      <MemoryRouter>
        <PaymentSummary paymentSummary={paymentSummary} couponCode={null} onCouponChange={onCouponChange} loadCart={loadCart} />
        <Location />
      </MemoryRouter>
    );

    await user.click(screen.getByTestId('place-order-button'));

    expect(axios.post).toHaveBeenCalledWith('/api/orders', { couponCode: null });
    // Navigating waits for the order and the cart, so it renders after the click has finished
    await waitFor(() => expect(screen.getByTestId('url-path')).toHaveTextContent('/orders'));
    expect(loadCart).toHaveBeenCalled();
  });
});
