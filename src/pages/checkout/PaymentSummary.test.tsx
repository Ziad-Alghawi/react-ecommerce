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
  let user;

  beforeEach(() => {
    paymentSummary = {
      totalItems: 3,
      productCostCents: 4275,
      shippingCostCents: 499,
      totalCostBeforeTaxCents: 4774,
      taxCents: 477,
      totalCostCents: 5251
    };

    loadCart = vi.fn();
    user = userEvent.setup();
  });

  it('disables the place order button when the cart is empty', () => {
    render(
      <MemoryRouter>
        <PaymentSummary
          paymentSummary={{ ...paymentSummary, totalItems: 0 }}
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
        <PaymentSummary paymentSummary={paymentSummary} loadCart={loadCart} />
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
        <PaymentSummary paymentSummary={paymentSummary} loadCart={loadCart} />
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
  });

  it('places an order and goes to the orders page', async () => {
    function Location() {
      const location = useLocation();
      return <div data-testid="url-path">{location.pathname}</div>;
    }

    render(
      <MemoryRouter>
        <PaymentSummary paymentSummary={paymentSummary} loadCart={loadCart} />
        <Location />
      </MemoryRouter>
    );

    await user.click(screen.getByTestId('place-order-button'));

    expect(axios.post).toHaveBeenCalledWith('/api/orders');
    // Navigating waits for the order and the cart, so it renders after the click has finished
    await waitFor(() => expect(screen.getByTestId('url-path')).toHaveTextContent('/orders'));
    expect(loadCart).toHaveBeenCalled();
  });
});
